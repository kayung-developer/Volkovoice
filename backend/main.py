# ==============================================================================
# Volkovoice: AI-Powered Russian Real-Time Dialogue Voice Clone Translator
# Final Backend Implementation: main.py
# ==============================================================================

# ==============================================================================
# I. CORE IMPORTS & INITIAL SETUP
# ==============================================================================
# Standard Library Imports
import os
import asyncio
import logging
import logging.config
import json
import datetime
import shutil
import gc
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional, AsyncGenerator, Dict, Any, Union
from uuid import uuid4

# Third-Party Library Imports
import fastapi
from fastapi import (
    FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect,
    UploadFile, File, Header, Query, Body, Request, BackgroundTasks
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer

import databases
import sqlalchemy
from sqlalchemy import (
    create_engine, MetaData, Table, Column, Integer, String, DateTime, Boolean, ForeignKey, JSON
)

from pydantic import BaseModel, Field, EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict


import firebase_admin
from firebase_admin import credentials, auth

import torch
from transformers import pipeline as hf_pipeline
from TTS.api import TTS
from pyannote.audio import Pipeline as DiarizationPipeline
import tempfile
import numpy as np
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts
import torchaudio
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import io
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer
from openai import AsyncOpenAI
# ==============================================================================
# II. ADVANCED LOGGING CONFIGURATION
# ==============================================================================
LOGGING_CONFIG = {
    "version": 1, "disable_existing_loggers": False,
    "formatters": {
        "default": {"()": "uvicorn.logging.DefaultFormatter",
                    "fmt": "%(levelprefix)s %(asctime)s - %(name)s - %(message)s", "use_colors": True},
        "json": {"()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                 "format": "%(asctime)s %(name)s %(levelname)s %(module)s %(funcName)s %(lineno)d %(message)s"}
    },
    "handlers": {
        "default": {"formatter": "default", "class": "logging.StreamHandler", "stream": "ext://sys.stderr"},
        "file_json": {"formatter": "json", "class": "logging.handlers.RotatingFileHandler",
                      "filename": "logs/volkovoice_app.log", "maxBytes": 10485760, "backupCount": 3}
    },
    "loggers": {
        "volkovoice": {"handlers": ["default", "file_json"], "level": "INFO", "propagate": False},
        "uvicorn.error": {"handlers": ["default", "file_json"], "level": "INFO", "propagate": False},
        "uvicorn.access": {"handlers": ["default", "file_json"], "level": "INFO", "propagate": False},
    },
}
if not os.path.exists("logs"): os.makedirs("logs")
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger("volkovoice")


# ==============================================================================
# III. APPLICATION CONFIGURATION MANAGEMENT
# ==============================================================================
class AppSettings(BaseSettings):
    APP_NAME: str = "Volkovoice"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = Field("development", description="Application environment: 'development' or 'production'")
    DATABASE_URL: str = "sqlite+aiosqlite:///./volkovoice_dev.db"
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    FIREBASE_SERVICE_ACCOUNT_KEY_JSON: str = Field(...)
    SUPERUSER_EMAIL: EmailStr = Field(...)
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    HUGGINGFACE_ACCESS_TOKEN: Optional[str] = None
    VOICE_CLONE_SAMPLES_DIR: str = "voice_clone_samples"
    VOICE_CLONE_MODELS_DIR: str = "voice_clone_models"
    OPENAI_API_KEY: Optional[str] = None  # NEW: For summarization

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

    @classmethod
    def assemble_db_connection(cls, v, values):
        if isinstance(v, str): return v
        if values.data.get("ENVIRONMENT") == "production":
            user, pw, srv, db = values.data.get("POSTGRES_USER"), values.data.get("POSTGRES_PASSWORD"), values.data.get(
                "POSTGRES_SERVER"), values.data.get("POSTGRES_DB")
            if not all([user, pw, srv, db]): raise ValueError("Postgres connection details missing for production.")
            return f"postgresql+asyncpg://{user}:{pw}@{srv}/{db}"
        return "sqlite+aiosqlite:///./volkovoice_dev.db"


try:
    settings = AppSettings()
    logger.info(f"Configuration loaded for '{settings.ENVIRONMENT}' environment.")
except Exception as e:
    print(f"FATAL: Could not load application settings. Error: {e}")
    exit(1)

limiter = Limiter(key_func=get_remote_address, default_limits=["1000/hour", "50/minute"])

# ==============================================================================
# IV. DATABASE SETUP
# ==============================================================================
database = databases.Database(settings.DATABASE_URL)
metadata = MetaData()
users = Table("users", metadata,
              Column("id", Integer, primary_key=True),
              Column("firebase_uid", String(255), unique=True, nullable=False, index=True),
              Column("email", String(255), unique=True, nullable=False, index=True),
              Column("full_name", String(255), nullable=True),
              Column("is_active", Boolean, default=True, nullable=False),
              Column("is_superuser", Boolean, default=False, nullable=False),
              Column("created_at", DateTime, default=datetime.datetime.utcnow),
              Column("last_login_at", DateTime, nullable=True),
              Column("preferences", JSON,
                     default={"theme": "system", "default_target_language": "en", "interface_language": "ru"})
              )
translation_history = Table("translation_history", metadata,
                            Column("id", Integer, primary_key=True),
                            Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
                            Column("source_language", String(10)), Column("target_language", String(10)),
                            Column("source_text", String), Column("translated_text", String),
                            Column("session_id", String(255), index=True),
                            Column("timestamp", DateTime, default=datetime.datetime.utcnow)
                            )
voice_clones = Table("voice_clones", metadata,
                     Column("id", Integer, primary_key=True),
                     Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
                     Column("clone_name", String(100), nullable=False),
                     Column("status", String(50), default="pending", nullable=False),
                     # pending, training, completed, failed
                     Column("model_path", String(512), nullable=True),
                     Column("source_audio_path", String(512), nullable=False),
                     Column("created_at", DateTime, default=datetime.datetime.utcnow)
                     )
engine = create_engine(settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", ""))
metadata.create_all(engine)

# ==============================================================================
# V. FIREBASE AUTHENTICATION SETUP
# ==============================================================================
try:
    firebase_cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_KEY_JSON)
    firebase_credentials = credentials.Certificate(firebase_cred_dict)
    firebase_app = firebase_admin.initialize_app(firebase_credentials)
    logger.info("Firebase Admin SDK initialized successfully.")
except Exception as e:
    logger.critical(f"Failed to initialize Firebase Admin SDK: {e}")
    firebase_app = None


# ==============================================================================
# VI. PYDANTIC MODELS (DATA TRANSFER OBJECTS)
# ==============================================================================
class UserPreferences(BaseModel):
    theme: str = Field("system", pattern="^(light|dark|system)$")
    default_target_language: str = "en"
    interface_language: str = "ru"
    avatar_url: Optional[str] = None # Added for Ready Player Me integration


class UserPublic(BaseModel):
    email: EmailStr;
    full_name: Optional[str] = None;
    preferences: UserPreferences


class UserInDB(UserPublic):
    id: int;
    firebase_uid: str;
    is_active: bool;
    is_superuser: bool;
    created_at: datetime.datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None;
    preferences: Optional[UserPreferences] = None


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None;
    is_superuser: Optional[bool] = None


class TextTranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_lang: str = "ru";
    target_lang: str = "en"


class TextTranslationResponse(BaseModel):
    source_text: str;
    translated_text: str;
    source_lang: str;
    target_lang: str


class VoiceCloneResponse(BaseModel):
    id: int;
    clone_name: str;
    status: str;
    created_at: datetime.datetime

class ChatSessionCreateResponse(BaseModel):
    session_id: str

class ChatMessage(BaseModel):
    text: str
    source_lang: str

class ChatMessageBroadcast(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    sender_uid: str
    original_text: str
    original_lang: str
    translated_text: str
    translated_lang: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

# NEW: Models for Voice Clone Management
class VoiceCloneUpdateRequest(BaseModel):
    clone_name: str = Field(..., min_length=1, max_length=100)

class VoiceClonePreviewRequest(BaseModel):
    text: str = Field("Hello, this is a test of my cloned voice.", min_length=5, max_length=250)
    language: str = "en"

class ConversationTurn(BaseModel):
    id: Union[str, int]
    type: str # "transcript" or "translation"
    speaker: Optional[str] = None
    text: str

class SummarizationRequest(BaseModel):
    conversation: List[ConversationTurn]
    source_lang: str
    target_lang: str

class SummarizationResponse(BaseModel):
    summary: str
    action_items: List[str]
    full_transcript: str

class HealthCheckResponse(BaseModel):
    status: str = "ok";
    database: str;
    firebase: str;
    timestamp: datetime.datetime



class HealthCheckResponse(BaseModel):
    status: str = "ok";
    database: str;
    firebase: str;
    timestamp: datetime.datetime


EMOTION_PRESETS = {
    "neutral": {
        "temperature": 0.75,
        "speed": 1.0,
        "top_p": 0.8,
        "repetition_penalty": 2.0,
        "length_penalty": 1.0,
    },
    "excited": {
        "temperature": 0.85,
        "speed": 1.1,
        "top_p": 0.8,
        "repetition_penalty": 2.5,
        "length_penalty": 0.8,
    },
    "calm": {
        "temperature": 0.6,
        "speed": 0.9,
        "top_p": 0.8,
        "repetition_penalty": 1.5,
        "length_penalty": 1.2,
    }
}

def get_emotion_params(emotion: Optional[str] = "neutral") -> Dict[str, float]:
    """
    Returns a dictionary of TTS parameters based on a selected emotion preset.
    Defaults to 'neutral' if the emotion is not found.
    """
    return EMOTION_PRESETS.get(emotion, EMOTION_PRESETS["neutral"])



# ==============================================================================
# VII. AI & ML MODEL MANAGEMENT
# ==============================================================================
class AIModelManager:
    def __init__(self):
        self.models = {};
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"AI models will be loaded on device: '{self.device}'")

    def load_all_models(self):
        logger.info("Loading all AI models...")

        # --- XTTS Model for Cloning & TTS ---
        # This is now the primary model for all voice synthesis.
        try:
            config = XttsConfig()
            # This path must point to the directory where you downloaded the XTTSv2 model files.
            # Assuming models are placed in a 'models' directory in the project root
            model_base_path = "models/xtts_v2"
            if not os.path.exists(model_base_path):
                 logger.critical(f"FATAL ERROR: XTTS model directory not found at '{model_base_path}'. Please download and place the model files there.")
                 raise FileNotFoundError("XTTS model files not found.")

            config.load_json(os.path.join(model_base_path, "config.json"))
            xtts_model = Xtts.init_from_config(config)
            xtts_model.load_checkpoint(
                config,
                checkpoint_path=os.path.join(model_base_path, "model.pth"),
                vocab_path=os.path.join(model_base_path, "vocab.json"),
                eval=True, # Set to eval mode for inference
                use_deepspeed=False # Typically false for inference
            )
            xtts_model.to(self.device)
            self.models['xtts'] = xtts_model
            logger.info("XTTS model for TTS and Voice Cloning loaded successfully.")
        except Exception as e:
            logger.critical(f"FATAL ERROR: Could not load the XTTS model. Voice features will fail. Error: {e}",
                            exc_info=True)
            # In a real system, this might prevent the app from starting or trigger alerts.

        # --- Other models ---
        try:
            self.models['stt'] = hf_pipeline("automatic-speech-recognition", model="openai/whisper-base",
                                             device=self.device)
            self.models['translator_ru_en'] = hf_pipeline("translation", model="Helsinki-NLP/opus-mt-ru-en",
                                                          device=self.device)
            self.models['translator_en_ru'] = hf_pipeline("translation", model="Helsinki-NLP/opus-mt-en-ru",
                                                          device=self.device)
            sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            self.models['keyword_extractor'] = KeyBERT(model=sentence_model)
            logger.info("KeyBERT model for Topic Recognition loaded successfully.")
        except Exception as e:
            logger.error(f"Could not load one or more Hugging Face pipeline models: {e}", exc_info=True)

        logger.info("AI model loading sequence complete.")


    def get_model(self, name: str):
        model = self.models.get(name)
        if model is None:
            logger.error(f"Attempted to access model '{name}', but it was not loaded.")
        return model

    def cleanup(self):
        self.models.clear();
        gc.collect()
        if self.device == "cuda": torch.cuda.empty_cache()

def extract_keywords_from_text(text: str, extractor: KeyBERT) -> List[str]:
    """Extracts relevant keywords from a text segment using KeyBERT."""
    if not text or len(text.split()) < 5: # Don't process very short texts
        return []
    try:
        # We use a low top_n to get only the most relevant keywords per segment
        keywords = extractor.extract_keywords(text, keyphrase_ngram_range=(1, 2), stop_words='english', top_n=3)
        # We only want the keyword text, not the score
        return [kw[0] for kw in keywords]
    except Exception as e:
        logger.error(f"Keyword extraction failed: {e}", exc_info=True)
        return []

async def run_true_voice_training_task(clone_id: int, source_audio_path: str, model_save_path: str):
    """
    This is the real, non-simulated voice cloning process. It computes the
    speaker conditioning latents from an audio file and saves them.
    """
    try:
        logger.info(f"STARTING TRUE VOICE CLONING for clone_id: {clone_id}")
        await database.execute(voice_clones.update().where(voice_clones.c.id == clone_id).values(status="training"))

        xtts_model = app.state.ai_model_manager.get_model('xtts')
        if not xtts_model:
            raise RuntimeError("XTTS model is not available for voice cloning.")

        # --- The Core Machine Learning Step ---
        # This function computes the unique vocal characteristics from the audio file.
        gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(audio_path=source_audio_path)

        # Save the computed tensors to the specified model_path.
        torch.save({
            'gpt_cond_latent': gpt_cond_latent,
            'speaker_embedding': speaker_embedding
        }, model_save_path)

        logger.info(f"SUCCESS: Voice cloning for clone_id {clone_id} completed. Latents saved to {model_save_path}")
        await database.execute(voice_clones.update().where(voice_clones.c.id == clone_id).values(status="completed",
                                                                                                 model_path=model_save_path))

    except Exception as e:
        logger.error(f"FAILURE: Voice cloning for clone_id {clone_id} failed. Error: {e}", exc_info=True)
        await database.execute(voice_clones.update().where(voice_clones.c.id == clone_id).values(status="failed"))



def format_transcript_for_llm(conversation: List[ConversationTurn], source_lang: str, target_lang: str) -> str:
    """Formats the conversation log into a clean, readable text block for an LLM."""
    transcript = f"This is a conversation transcript between speakers. The primary language is {source_lang} and the translation is in {target_lang}.\n\n"
    for turn in conversation:
        if turn.type == "transcript":
            speaker = turn.speaker or "Unknown"
            transcript += f"[{speaker} ({source_lang})]: {turn.text}\n"
        elif turn.type == "translation":
            speaker = turn.speaker or "Unknown"
            # We include the translation for context, but the summary should be based on the original speech
            transcript += f"  └ [Translation for {speaker} ({target_lang})]: {turn.text}\n"
    return transcript

async def generate_summary_with_llm(full_transcript: str) -> Dict[str, Any]:
    """
    Generates a summary and action items from a transcript using the OpenAI API.
    This is the final, production-ready implementation.
    """
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set. Summarization will be disabled.")
        return {
            "summary": "Summary feature is not configured. An administrator needs to provide an API key.",
            "action_items": []
        }

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    system_prompt = """
    You are a highly skilled assistant that analyzes conversation transcripts.
    Your task is to provide a concise, neutral summary of the key topics discussed
    and to extract a clear, bulleted list of actionable items.
    Your response MUST be a valid JSON object with two keys: "summary" (a string)
    and "action_items" (a list of strings).
    If no action items are found, return an empty list.
    """

    try:
        logger.info("Making API call to OpenAI for summarization...")
        response = await client.chat.completions.create(
            model="gpt-4-turbo-preview", # Or another suitable model like gpt-3.5-turbo
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_transcript}
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        content = response.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        logger.error(f"OpenAI API call for summarization failed: {e}", exc_info=True)
        return {
            "summary": "An error occurred while generating the summary.",
            "action_items": []
        }
# ==============================================================================
# VIII. LIFESPAN MANAGEMENT & MIDDLEWARE
# ==============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application startup sequence initiated.")
    await database.connect()
    if not os.path.exists(settings.VOICE_CLONE_SAMPLES_DIR): os.makedirs(settings.VOICE_CLONE_SAMPLES_DIR)
    if not os.path.exists(settings.VOICE_CLONE_MODELS_DIR): os.makedirs(settings.VOICE_CLONE_MODELS_DIR)

    app.state.ai_model_manager = AIModelManager()
    logger.info("Loading AI Models...")
    # Load all models at once for simplicity and to ensure they are ready
    app.state.ai_model_manager.load_all_models()

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    logger.info("AI Model loading sequence complete.")
    yield
    # Shutdown
    logger.info("Application shutdown sequence initiated.")
    await database.disconnect()
    app.state.ai_model_manager.cleanup()


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan, docs_url="/api/docs",
              redoc_url="/api/redoc")
app.add_middleware(CORSMiddleware, allow_origins=settings.ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"],
                   allow_headers=["*"])


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response



# ==============================================================================
# ### CULTURAL NUANCE ENGINE DATABASE ###
# ==============================================================================
# In a large-scale production system, this would be a dedicated microservice or
# a database table. For our single-file robust application, a well-structured
# dictionary is a highly performant and maintainable solution.

RUSSIAN_IDIOMS_DATABASE: Dict[str, Dict[str, str]] = {
    "вешать лапшу на уши": {
        "meaning": "To deceive or mislead someone, to tell lies.",
        "literal_translation": "to hang noodles on someone's ears",
        "english_equivalent": "to pull someone's leg"
    },
    "когда рак на горе свистнет": {
        "meaning": "Something that will never happen.",
        "literal_translation": "when the crawfish whistles on the mountain",
        "english_equivalent": "when pigs fly"
    },
    "делать из мухи слона": {
        "meaning": "To exaggerate a problem.",
        "literal_translation": "to make an elephant out of a fly",
        "english_equivalent": "to make a mountain out of a molehill"
    },
    "зарубить себе на носу": {
        "meaning": "To remember something firmly, to make a mental note.",
        "literal_translation": "to make a notch on one's nose",
        "english_equivalent": "to etch it in your mind"
    },
    "без царя в голове": {
        "meaning": "A person who is foolish, reckless, or irresponsible.",
        "literal_translation": "without a tsar in the head",
        "english_equivalent": "to have screws loose"
    },
    "работать спустя рукава": {
        "meaning": "To work carelessly or negligently.",
        "literal_translation": "to work with sleeves down",
        "english_equivalent": "to slack off"
    },
    "точить лясы": {
        "meaning": "To chat idly or gossip.",
        "literal_translation": "to sharpen strap-hinges",
        "english_equivalent": "to chew the fat"
    }
}

class IdiomDetails(BaseModel):
    idiom: str
    meaning: str
    english_equivalent: str

# ==============================================================================
# IX. AUTHENTICATION & DEPENDENCIES
# ==============================================================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


async def get_current_user_from_token(token: Optional[str] = Depends(oauth2_scheme)) -> auth.UserRecord:
    if not firebase_app: raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Firebase not available.")
    if not token: raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        return auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Could not validate credentials")


async def get_current_active_user(firebase_user: dict = Depends(get_current_user_from_token)) -> UserInDB:
    user_record = await database.fetch_one(users.select().where(users.c.firebase_uid == firebase_user['uid']))
    if not user_record:
        # User exists in Firebase but not our DB, create them.
        insert_query = users.insert().values(
            firebase_uid=firebase_user['uid'],
            email=firebase_user['email'],
            full_name=firebase_user.get('name'), # Try to get name from Firebase
            is_superuser=(firebase_user['email'] == settings.SUPERUSER_EMAIL),
            last_login_at=datetime.datetime.utcnow()
        )
        user_id = await database.execute(insert_query)
        user_record = await database.fetch_one(users.select().where(users.c.id == user_id))
    else:
        # User exists, update last login time
        await database.execute(
            users.update().where(users.c.id == user_record['id']).values(last_login_at=datetime.datetime.utcnow()))

    user = UserInDB(**user_record)
    if not user.is_active: raise HTTPException(status.HTTP_400_BAD_REQUEST, "Inactive user")
    return user


async def get_superuser(current_user: UserInDB = Depends(get_current_active_user)):
    if not current_user.is_superuser: raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a superuser")
    return current_user


def adjust_formality_for_translation(text: str, target_lang: str, formality: Optional[str]) -> str:
    """
    Intelligently adjusts pronouns and common phrases for formal/informal address
    when translating from English to Russian.
    """
    if target_lang != 'ru' or formality not in ['formal', 'informal']:
        return text

    text_adjusted = text
    if formality == 'formal':
        text_adjusted = re.sub(r'\b(are you)\b', r'are you (formal)', text_adjusted, flags=re.IGNORECASE)
        text_adjusted = re.sub(r'\b(your name)\b', r'your name (formal)', text_adjusted, flags=re.IGNORECASE)
        text_adjusted = re.sub(r"\b(you)\b", r"you (formal)", text_adjusted, flags=re.IGNORECASE)
        logger.info(f"Applied FORMAL hints to text: '{text_adjusted}'")

    elif formality == 'informal':
        text_adjusted = re.sub(r'\b(are you)\b', r'are you (informal)', text_adjusted, flags=re.IGNORECASE)
        text_adjusted = re.sub(r'\b(your name)\b', r'your name (informal)', text_adjusted, flags=re.IGNORECASE)
        text_adjusted = re.sub(r"\b(you)\b", r"you (informal)", text_adjusted, flags=re.IGNORECASE)
        logger.info(f"Applied INFORMAL hints to text: '{text_adjusted}'")

    return text_adjusted


# ==============================================================================
# X. API ENDPOINTS
# ==============================================================================
# --- System Router ---
system_router = fastapi.APIRouter(tags=["System"])


@system_router.get("/", summary="Root Endpoint")
async def read_root(): return {"application": settings.APP_NAME, "version": settings.APP_VERSION}


@system_router.get("/health", response_model=HealthCheckResponse, summary="Health Check")
async def health_check():
    db_status = "connected" if database.is_connected else "disconnected"
    return HealthCheckResponse(database=db_status, firebase="initialized" if firebase_app else "error",
                               timestamp=datetime.datetime.utcnow())


# --- User Router ---
user_router = fastapi.APIRouter(prefix="/api/users", tags=["Users"])


@user_router.get("/me", response_model=UserPublic)
async def read_users_me(user: UserInDB = Depends(get_current_active_user)): return user


@user_router.put("/me", response_model=UserPublic)
async def update_my_profile(update_data: UserUpdate, user: UserInDB = Depends(get_current_active_user)):
    update_values = update_data.model_dump(exclude_unset=True)
    if "preferences" in update_values and update_values["preferences"] is not None:
        # Merge, don't overwrite, preferences
        current_preferences = json.loads(user.preferences) if isinstance(user.preferences, str) else user.preferences
        updated_preferences = {**current_preferences, **update_values["preferences"]}
        update_values["preferences"] = updated_preferences

    if not update_values:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update.")

    await database.execute(users.update().where(users.c.id == user.id).values(**update_values))
    updated_user_record = await database.fetch_one(users.select().where(users.c.id == user.id))
    return updated_user_record


# --- Translation Router ---
translation_router = fastapi.APIRouter(prefix="/api/translate", tags=["Translation"])

# ### ENHANCED: Text Translation Endpoint ###
class AdvancedTextTranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_lang: str
    target_lang: str
    enable_idiom_replacement: bool = True
    # New field for formality control
    formality: Optional[str] = Field(None, pattern="^(formal|informal)$")

class AdvancedTextTranslationResponse(BaseModel):
    source_text: str
    translated_text: str
    natural_translation: Optional[str] = None  # The new, idiom-replaced translation
    source_lang: str
    target_lang: str
    detected_idioms: List[IdiomDetails] = []


@translation_router.post("/text", response_model=AdvancedTextTranslationResponse)
async def translate_text_advanced(
        req: Request,
        payload: AdvancedTextTranslationRequest,
        user=Depends(get_current_active_user)
):
    source_text = payload.text
    source_lang = payload.source_lang
    target_lang = payload.target_lang
    text_to_translate = adjust_formality_for_translation(source_text, target_lang, payload.formality)
    # Ensure this feature only runs for RU -> EN translations
    if source_lang != 'ru' or target_lang != 'en':
        payload.enable_idiom_replacement = False

    enable_idiom_replacement = payload.enable_idiom_replacement and source_lang == 'ru' and target_lang == 'en'

    translator = req.app.state.ai_model_manager.get_model(f"translator_{source_lang}_{target_lang}")
    if not translator:
        raise HTTPException(501, "Translation direction not supported.")

    # --- Step 1: Standard Translation ---
    # Get the direct, literal translation first.
    direct_translation_result = translator(text_to_translate)
    direct_translation = direct_translation_result[0]['translation_text'] if direct_translation_result else ""

    detected_idioms: List[IdiomDetails] = []
    text_for_natural_translation = text_to_translate

    if enable_idiom_replacement:
        text_lower = text_to_translate.lower()
        for idiom, details in RUSSIAN_IDIOMS_DATABASE.items():
            if idiom in text_lower:
                detected_idioms.append(IdiomDetails(**details, idiom=idiom))
                text_for_natural_translation = re.sub(idiom, details['english_equivalent'],
                                                      text_for_natural_translation, flags=re.IGNORECASE)

    natural_translation = None
    if detected_idioms and enable_idiom_replacement:
        natural_translation_result = translator(text_for_natural_translation)
        natural_translation = natural_translation_result[0]['translation_text'] if natural_translation_result else ""

    # Final cleanup of any hint tokens that might have slipped through
    if target_lang == 'ru':
        direct_translation = direct_translation.replace("(formal)", "").replace("(informal)", "").strip()

    # --- Step 4: Log and Respond ---
    await database.execute(
        translation_history.insert().values(
            user_id=user.id,
            source_language=source_lang,
            target_language=target_lang,
            source_text=source_text,
            translated_text=natural_translation or direct_translation,
            session_id=str(uuid.uuid4())
        )
    )

    return AdvancedTextTranslationResponse(
        source_text=source_text,
        translated_text=direct_translation,
        natural_translation=natural_translation,
        source_lang=source_lang,
        target_lang=target_lang,
        detected_idioms=detected_idioms
    )


# --- Voice Cloning Router ---
voice_clone_router = fastapi.APIRouter(prefix="/api/voice-clone", tags=["Voice Cloning"],
                                       dependencies=[Depends(get_current_active_user)])


@voice_clone_router.post("", response_model=VoiceCloneResponse, status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/hour") # Apply the rate limit
async def upload_voice_sample(
    background_tasks: BackgroundTasks,
    name: str = Body(...),
    file: UploadFile = File(...),
    user: UserInDB = Depends(get_current_active_user)
):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid file type. Please upload an audio file.")

    # Sanitize file name and create unique paths
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(safe_filename)[1] or '.wav'
    save_path = os.path.join(settings.VOICE_CLONE_SAMPLES_DIR, f"user_{user.id}_{file_id}{file_extension}")
    model_save_path = os.path.join(settings.VOICE_CLONE_MODELS_DIR, f"user_{user.id}_{file_id}_latents.pth")

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded file for user {user.id}: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not save uploaded file.")

    clone_id = await database.execute(
        voice_clones.insert().values(user_id=user.id, clone_name=name, source_audio_path=save_path))

    # Run the actual training task in the background
    background_tasks.add_task(run_true_voice_training_task, clone_id, save_path, model_save_path)

    new_clone = await database.fetch_one(voice_clones.select().where(voice_clones.c.id == clone_id))
    return new_clone

@voice_clone_router.get("/", response_model=List[VoiceCloneResponse])
async def get_user_voice_clones(user: UserInDB = Depends(get_current_active_user)):
    return await database.fetch_all(voice_clones.select().where(voice_clones.c.user_id == user.id))


# --- NEW: Voice Clone Management Endpoints ---

@voice_clone_router.delete("/{clone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice_clone(clone_id: int, user: UserInDB = Depends(get_current_active_user)):
    clone = await database.fetch_one(voice_clones.select().where(voice_clones.c.id == clone_id))
    if not clone or clone['user_id'] != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice clone not found.")

    # Clean up files from the filesystem
    if clone['source_audio_path'] and os.path.exists(clone['source_audio_path']):
        os.remove(clone['source_audio_path'])
    if clone['model_path'] and os.path.exists(clone['model_path']):
        os.remove(clone['model_path'])

    await database.execute(voice_clones.delete().where(voice_clones.c.id == clone_id))
    return


@voice_clone_router.put("/{clone_id}", response_model=VoiceCloneResponse)
async def update_voice_clone(clone_id: int, payload: VoiceCloneUpdateRequest, user: UserInDB = Depends(get_current_active_user)):
    clone = await database.fetch_one(voice_clones.select().where(voice_clones.c.id == clone_id))
    if not clone or clone['user_id'] != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice clone not found.")

    await database.execute(voice_clones.update().where(voice_clones.c.id == clone_id).values(clone_name=payload.clone_name))
    return await database.fetch_one(voice_clones.select().where(voice_clones.c.id == clone_id))


@voice_clone_router.post("/{clone_id}/preview", response_class=StreamingResponse)
async def preview_voice_clone(
    clone_id: int,
    payload: VoiceClonePreviewRequest,
    req: Request,
    user: UserInDB = Depends(get_current_active_user)
):
    clone = await database.fetch_one(voice_clones.select().where(voice_clones.c.id == clone_id))
    if not clone or clone['user_id'] != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice clone not found.")
    if clone['status'] != 'completed' or not clone['model_path']:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Voice clone is not ready for preview.")

    xtts_model = req.app.state.ai_model_manager.get_model('xtts')
    if not xtts_model:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "TTS service is not available.")

    try:
        latents = torch.load(clone['model_path'], map_location=xtts_model.device)
        gpt_cond_latent = latents['gpt_cond_latent']
        speaker_embedding = latents['speaker_embedding']

        # NEW: Get emotion parameters from the helper function
        emotion_params = get_emotion_params(payload.emotion)
        logger.info(f"Generating preview for clone {clone_id} with emotion '{payload.emotion}': {emotion_params}")


        tts_chunks = xtts_model.tts_stream(
            text=payload.text,
            language=payload.language,
            gpt_cond_latent=gpt_cond_latent,
            speaker_embedding=speaker_embedding,
            **emotion_params # Unpack the emotion settings here
        )

        async def audio_stream_generator():
            for chunk in tts_chunks:
                yield chunk.cpu().numpy().tobytes()

        return StreamingResponse(audio_stream_generator(), media_type="audio/wav")

    except Exception as e:
        logger.error(f"Failed to generate voice preview for clone {clone_id}: {e}", exc_info=True)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to generate audio preview.")

# --- Admin Router ---
admin_router = fastapi.APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(get_superuser)])


@admin_router.get("/users", response_model=List[UserInDB])
async def list_users(): return await database.fetch_all(users.select())


@admin_router.put("/users/{user_id}", response_model=UserInDB)
async def update_user_by_admin(user_id: int, update: AdminUserUpdate):
    await database.execute(users.update().where(users.c.id == user_id).values(**update.model_dump(exclude_unset=True)))
    return await database.fetch_one(users.select().where(users.c.id == user_id))

conversation_router = fastapi.APIRouter(prefix="/api/conversation", tags=["Conversation"], dependencies=[Depends(get_current_active_user)])

@conversation_router.post("/summarize", response_model=SummarizationResponse)
async def summarize_conversation(
    payload: SummarizationRequest,
    user: UserInDB = Depends(get_current_active_user)
):
    if not payload.conversation:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot summarize an empty conversation.")

    try:
        full_transcript = format_transcript_for_llm(payload.conversation, payload.source_lang, payload.target_lang)
        llm_result = await generate_summary_with_llm(full_transcript)

        return SummarizationResponse(
            summary=llm_result.get("summary", "Could not generate summary."),
            action_items=llm_result.get("action_items", []),
            full_transcript=full_transcript
        )
    except Exception as e:
        logger.error(f"Summarization failed for user {user.id}: {e}", exc_info=True)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to generate conversation summary.")


chat_router = fastapi.APIRouter(prefix="/api/chat", tags=["Chat"], dependencies=[Depends(get_current_active_user)])

@chat_router.post("/create", response_model=ChatSessionCreateResponse)
async def create_chat_session():
    """Generates a new unique ID for a chat session."""
    session_id = str(uuid4())
    # In a production system, you might save this to a DB with an expiry time
    return ChatSessionCreateResponse(session_id=session_id)



# --- Include Routers ---
app.include_router(system_router)
app.include_router(user_router)
app.include_router(translation_router)
app.include_router(voice_clone_router)
app.include_router(admin_router)
app.include_router(conversation_router)
app.include_router(chat_router)


# ==============================================================================
# XI. REAL-TIME TRANSLATION (WEBSOCKETS)
# ==============================================================================
class ConnectionManager:
    def __init__(self): self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, ws: WebSocket, user_id: int): await ws.accept(); self.active_connections[user_id] = ws

    def disconnect(self, user_id: int): self.active_connections.pop(user_id, None)

    async def send_json(self, msg: dict, user_id: int):
      ws = self.active_connections.get(user_id)
      if ws:
        try:
            await ws.send_json(msg)
        except WebSocketDisconnect:
            self.disconnect(user_id)
        except Exception as e:
            logger.error(f"Error sending JSON to user {user_id}: {e}")


    async def send_bytes(self, data: bytes, user_id: int):
      ws = self.active_connections.get(user_id)
      if ws:
        try:
            await ws.send_bytes(data)
        except WebSocketDisconnect:
            self.disconnect(user_id)
        except Exception as e:
            logger.error(f"Error sending bytes to user {user_id}: {e}")

manager = ConnectionManager()


async def audio_pipeline(ws: WebSocket, user_id: int, app_state: Any, config: Dict):
    initial_user_check = await database.fetch_one(users.select().where(users.c.id == user_id))
    if not initial_user_check or not initial_user_check['is_active']:
        logger.warning(f"WebSocket connection for inactive or non-existent user_id {user_id} terminated.")
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="User account is inactive.")
        return

    xtts_model = app_state.ai_model_manager.get_model('xtts')
    stt = app_state.ai_model_manager.get_model('stt')
    keyword_extractor = app_state.ai_model_manager.get_model('keyword_extractor')
    # Using a local reference to avoid repeated lookups
    diarization_pipeline = app_state.ai_model_manager.models.get('diarization') # Use .get for safety

    if not all([xtts_model, stt]):
        logger.error(f"User {user_id}: Essential AI models (XTTS, STT) not loaded. Terminating WebSocket.")
        await manager.send_json({"type": "error", "data": "Core AI services are unavailable. Please try again later."}, user_id)
        await ws.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    if not diarization_pipeline:
        logger.warning(f"User {user_id}: Diarization model not loaded. Multi-speaker detection is disabled.")

    audio_queue = asyncio.Queue()
    live_cloned_latents = None
    has_attempted_live_clone = False

    async def receiver():
        try:
            while True:
                msg = await ws.receive()
                if msg.get("type") == "websocket.disconnect":
                    break
                if "bytes" in msg:
                    await audio_queue.put(msg["bytes"])
                elif "text" in msg:
                    try:
                        data = json.loads(msg["text"]);
                        if data.get("type") == "config":
                            config.update(data.get("data", {}))
                            logger.info(f"User {user_id} updated WS config: {config}")
                            await manager.send_json({"type": "status", "data": "Configuration updated."}, user_id)
                    except json.JSONDecodeError:
                        logger.warning(f"Received invalid JSON from user {user_id}")
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {user_id}.")
        finally:
            await audio_queue.put(None) # Signal processor to stop

    async def processor():
        nonlocal live_cloned_latents, has_attempted_live_clone
        audio_buffer = bytearray()
        # Assuming 16kHz, 16-bit mono audio. 5 seconds = 16000 * 2 * 5 = 160KB
        DIARIZATION_THRESHOLD = 180000
        LIVE_CLONE_THRESHOLD = 160000

        while True:
            chunk = await audio_queue.get()
            if chunk is None: break
            audio_buffer.extend(chunk)

            # --- DYNAMIC PROCESSING LOGIC ---
            if not has_attempted_live_clone and not config.get('voice_clone_id') and len(audio_buffer) > LIVE_CLONE_THRESHOLD:
                has_attempted_live_clone = True
                try:
                    await manager.send_json({"type": "status", "data": "Analyzing your voice for live cloning..."}, user_id)
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmpfile:
                        audio_np = np.frombuffer(audio_buffer, dtype=np.int16).astype(np.float32) / 32768.0
                        audio_tensor = torch.from_numpy(audio_np).unsqueeze(0)
                        torchaudio.save(tmpfile.name, audio_tensor, 16000)

                        gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(audio_path=tmpfile.name)
                        live_cloned_latents = {'gpt_cond_latent': gpt_cond_latent, 'speaker_embedding': speaker_embedding}
                        logger.info(f"Successfully performed live voice clone for user {user_id}")
                        await manager.send_json({"type": "live_clone_success", "data": "Live clone successful! Translations will now use your voice."})
                except Exception as e:
                    logger.error(f"Live voice cloning failed for user {user_id}: {e}")
                    await manager.send_json({"type": "error", "data": "Live voice cloning failed. Using default voice."})

            if diarization_pipeline and len(audio_buffer) > DIARIZATION_THRESHOLD:
                try:
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmpfile:
                        audio_np = np.frombuffer(audio_buffer, dtype=np.int16).astype(np.float32) / 32768.0
                        audio_tensor = torch.from_numpy(audio_np).unsqueeze(0)
                        torchaudio.save(tmpfile.name, audio_tensor, 16000)
                        audio_buffer.clear()

                        await manager.send_json({"type": "status", "data": "Identifying speakers..."}, user_id)
                        diarization = diarization_pipeline(tmpfile.name)

                        for turn, _, speaker in diarization.itertracks(yield_label=True):
                            start_time, end_time = turn.start, turn.end

                            # 4. Extract audio segment for this specific speaker
                            waveform, sample_rate = torchaudio.load(tmpfile.name)
                            segment = waveform[0, int(start_time * sample_rate):int(end_time * sample_rate)]

                            if segment.shape[0] < (sample_rate * 0.5):  # Ignore very short segments
                                continue

                            # 5. Transcribe the segment
                            await manager.send_json({"type": "status", "data": f"Transcribing {speaker}..."}, user_id)
                            stt_res = stt(segment.numpy(), generate_kwargs={"language": config['source_lang']})
                            transcribed = stt_res["text"].strip()
                            if not transcribed: continue

                            # Send transcript with speaker ID
                            await manager.send_json({"type": "transcript",
                                                           "data": {"text": transcribed, "lang": config['source_lang'],
                                                                    "speaker": speaker}}, user_id)

                            # --- NEW: EXTRACT AND SEND KEYWORDS ---
                            if keyword_extractor:
                                keywords = extract_keywords_from_text(transcribed, keyword_extractor)
                                if keywords:
                                    logger.info(f"Identified keywords for user {user_id}: {keywords}")
                                    await manager.send_json({"type": "keywords", "data": keywords}, user_id)

                            # 6. Translate the segment
                            # (For simplicity, we won't call the full advanced translate endpoint here, but a production system could)
                            translator = app_state.ai_model_manager.get_model(
                                f"translator_{config['source_lang']}_{config['target_lang']}")
                            translated = translator(transcribed)[0]['translation_text']
                            await manager.send_json({"type": "translation",
                                                     "data": {"text": translated, "lang": config['target_lang'],
                                                              "speaker": speaker}}, user_id)

                            voice_clone_id = config.get('voice_clone_id')
                            speaker_latents = None

                            if voice_clone_id:  # Priority 1: User selected an offline clone
                                clone_record = await database.fetch_one(
                                    voice_clones.select().where(voice_clones.c.id == voice_clone_id,
                                                                voice_clones.c.user_id == user_id))
                                if clone_record and clone_record['status'] == 'completed' and clone_record[
                                    'model_path']:
                                    speaker_latents = torch.load(clone_record['model_path'],
                                                                 map_location=xtts_model.device)

                            elif live_cloned_latents:  # Priority 2: Use the live-cloned voice
                                speaker_latents = live_cloned_latents

                            # Synthesize speech
                            tts_kwargs = {
                                "text": translated,
                                "language": config.get('target_lang', 'en'),
                            }

                            # Add voice cloning latents if available
                            if speaker_latents:
                                tts_kwargs['gpt_cond_latent'] = speaker_latents['gpt_cond_latent']
                                tts_kwargs['speaker_embedding'] = speaker_latents['speaker_embedding']
                            else:
                                # Fallback to a default speaker wav if no clone is used
                                default_wav_path = "models/default_reference.wav"
                                if os.path.exists(default_wav_path):
                                    tts_kwargs['speaker_wav'] = default_wav_path

                            # --- NEW: APPLY EMOTION PARAMETERS ---
                            # Get the emotion from the WebSocket config, defaulting to 'neutral'
                            selected_emotion = config.get('emotion', 'neutral')
                            emotion_params = get_emotion_params(selected_emotion)
                            tts_kwargs.update(emotion_params)  # Add the emotion params to the TTS arguments
                            logger.info(
                                f"Synthesizing for user {user_id} with emotion '{selected_emotion}': {emotion_params}")

                            # Generate audio chunks with the combined parameters
                            tts_chunks = xtts_model.tts_stream(**tts_kwargs)
                            for chunk in tts_chunks:
                                await manager.send_bytes(chunk.to(torch.int16).cpu().numpy().tobytes(), user_id)
                except Exception as e:
                    logger.error(f"WS Diarization Pipeline Error for user {user_id}: {e}", exc_info=True)
                    await manager.send_json({"type": "error", "data": "Speaker identification failed."}, user_id)
                    audio_buffer.clear()
            # Fallback for single speaker or small buffers
            elif len(audio_buffer) > 96000:
                # This part handles single-speaker translation when diarization is off or buffer is small
                try:
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmpfile:
                        audio_np = np.frombuffer(audio_buffer, dtype=np.int16).astype(np.float32) / 32768.0
                        audio_tensor = torch.from_numpy(audio_np).unsqueeze(0)
                        torchaudio.save(tmpfile.name, audio_tensor, 16000)
                        audio_buffer.clear()

                        # 1. Transcribe
                        await manager.send_json({"type": "status", "data": f"Transcribing..."}, user_id)
                        stt_res = stt(tmpfile.name, generate_kwargs={"language": config.get('source_lang', 'ru')})
                        transcribed = stt_res["text"].strip()
                        if not transcribed: continue

                        await manager.send_json({"type": "transcript", "data": {"text": transcribed, "lang": config['source_lang'], "speaker": "SPEAKER_00"}}, user_id)

                        # 2. Translate
                        translator = app_state.ai_model_manager.get_model(f"translator_{config['source_lang']}_{config['target_lang']}")
                        translated = translator(transcribed)[0]['translation_text']
                        await manager.send_json({"type": "translation", "data": {"text": translated, "lang": config['target_lang'], "speaker": "SPEAKER_00"}}, user_id)

                        # 3. Synthesize
                        voice_clone_id = config.get('voice_clone_id')
                        speaker_latents = None

                        if voice_clone_id:
                            clone_record = await database.fetch_one(voice_clones.select().where(voice_clones.c.id == voice_clone_id, voice_clones.c.user_id == user_id))
                            if clone_record and clone_record['status'] == 'completed' and clone_record['model_path']:
                                speaker_latents = torch.load(clone_record['model_path'], map_location=xtts_model.device)
                        elif live_cloned_latents:
                            speaker_latents = live_cloned_latents

                        tts_kwargs = {"text": translated, "language": config.get('target_lang', 'en')}
                        if speaker_latents:
                            tts_kwargs['gpt_cond_latent'] = speaker_latents['gpt_cond_latent']
                            tts_kwargs['speaker_embedding'] = speaker_latents['speaker_embedding']
                        else:
                            # Add a default reference audio if you have one, for better default voice quality
                             default_wav_path = "models/default_reference.wav"
                             if os.path.exists(default_wav_path):
                                tts_kwargs['speaker_wav'] = default_wav_path

                        tts_chunks = xtts_model.tts_stream(**tts_kwargs)
                        for chunk in tts_chunks:
                            await manager.send_bytes(chunk.to(torch.int16).cpu().numpy().tobytes(), user_id)

                except Exception as e:
                    logger.error(f"WS Single-Speaker Pipeline Error for user {user_id}: {e}", exc_info=True)
                    await manager.send_json({"type": "error", "data": "An error occurred during translation."}, user_id)
                    audio_buffer.clear()

    await asyncio.gather(receiver(), processor())


@app.websocket("/ws/translate")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        fb_user = await get_current_user_from_token(token)
        user = await get_current_active_user(fb_user)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION);
        return

    await manager.connect(websocket, user.id)
    # Load user preferences into the initial config
    user_prefs = json.loads(user.preferences) if isinstance(user.preferences, str) else user.preferences
    config = {
        "source_lang": user_prefs.get('interface_language', 'ru'),
        "target_lang": user_prefs.get('default_target_language', 'en'),
        "voice_clone_id": None, # Start with no clone selected
        "formality": "formal" # Default formality
    }

    try:
        await manager.send_json({"type": "status", "data": "Connected to Volkovoice."}, user.id)
        await audio_pipeline(websocket, user.id, app.state, config)
    except Exception as e:
        logger.error(f"Unhandled WS Error for user {user.id}: {e}", exc_info=True)
    finally:
        manager.disconnect(user.id)
        logger.info(f"Cleaned up connection for user {user.id}")


class ChatConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, ws: WebSocket, session_id: str, user_uid: str):
        await ws.accept()
        if session_id not in self.rooms:
            self.rooms[session_id] = {}
        self.rooms[session_id][user_uid] = ws
        logger.info(f"User {user_uid} connected to chat session {session_id}")

    def disconnect(self, session_id: str, user_uid: str):
        if session_id in self.rooms:
            if user_uid in self.rooms[session_id]:
                del self.rooms[session_id][user_uid]
                if not self.rooms[session_id]: # Delete room if empty
                    del self.rooms[session_id]
        logger.info(f"User {user_uid} disconnected from chat session {session_id}")

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.rooms:
            for uid, connection in self.rooms[session_id].items():
                try:
                    await connection.send_json(message)
                except WebSocketDisconnect:
                    self.disconnect(session_id, uid)

chat_manager = ChatConnectionManager()

@app.websocket("/ws/chat/{session_id}")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...)
):
    try:
        fb_user = await get_current_user_from_token(token)
        user = await get_current_active_user(fb_user)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return

    await chat_manager.connect(websocket, session_id, user.firebase_uid)
    ai_models = websocket.app.state.ai_model_manager

    try:
        while True:
            data = await websocket.receive_json()
            message = ChatMessage(**data)

            # Determine translation direction based on sender's source language
            source_lang = message.source_lang
            target_lang = 'en' if source_lang == 'ru' else 'ru'

            translator = ai_models.get_model(f"translator_{source_lang}_{target_lang}")
            if not translator:
                # Handle unsupported language pair
                logger.warning(f"Unsupported translation in chat: {source_lang} to {target_lang}")
                continue

            translated_text = translator(message.text)[0]['translation_text']

            broadcast_message = ChatMessageBroadcast(
                sender_uid=user.firebase_uid,
                original_text=message.text,
                original_lang=source_lang,
                translated_text=translated_text,
                translated_lang=target_lang
            )

            await chat_manager.broadcast(session_id, broadcast_message.model_dump(mode='json'))

    except WebSocketDisconnect:
        chat_manager.disconnect(session_id, user.firebase_uid)
    except Exception as e:
        logger.error(f"Error in chat websocket for user {user.firebase_uid} in session {session_id}: {e}")
        chat_manager.disconnect(session_id, user.firebase_uid)
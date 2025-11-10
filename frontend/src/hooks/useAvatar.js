// frontend/src/hooks/useAvatar.js
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Manages a 3D avatar scene with real-time audio visualization for lip-sync.
 * @param {React.RefObject<HTMLDivElement>} containerRef - Ref to the container div.
 * @param {string} avatarUrl - URL of the Ready Player Me GLB model.
 * @param {MediaStream | null} stream - The user's live microphone stream.
 */
 // --- Configuration for Expressive Animation ---
const SMOOTHING_FACTOR = 0.6; // How much to smooth the animation
const BLINK_INTERVAL = 4000; // Blink every 4 seconds on average


export const useAvatar = (containerRef, avatarUrl, stream) => {
  const animationFrameId = useRef(null);
  const audioAnalyser = useRef(null);
  const sceneElements = useRef(null);
  const clock = useRef(new THREE.Clock()); // For idle animations

  // Refs to store smoothed animation values to prevent jittering
  const smoothedValues = useRef({});

  useEffect(() => {
    if (!containerRef.current || !avatarUrl) return;

    const container = containerRef.current;

    // --- 1. Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 2.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- 2. Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // --- 3. Controls (Optional but good for UX) ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.update();

    // --- 4. Load Avatar Model ---
    const loader = new GLTFLoader();
    let morphTargets = {};
    let leftEyeBone = null;
    let rightEyeBone = null;
    let headBone = null;

    loader.load(avatarUrl, (gltf) => {
      const avatar = gltf.scene;
      scene.add(avatar);
      avatar.traverse((node) => {
        // Find the main mesh for facial expressions
        if (node.isSkinnedMesh && node.morphTargetInfluences) {
          morphTargets.mesh = node;
          morphTargets.influences = node.morphTargetInfluences;
          morphTargets.dictionary = node.morphTargetDictionary;
          // Initialize smoothed values for all morphs
          Object.keys(morphTargets.dictionary).forEach(key => {
            smoothedValues.current[key] = 0;
          });
        }
        // Find bones for procedural animation
        if (node.isBone) {
          if (node.name === 'LeftEye') leftEyeBone = node;
          if (node.name === 'RightEye') rightEyeBone = node;
          if (node.name === 'Head') headBone = node;
        }
      });
    });

    sceneElements.current = { scene, camera, renderer, controls, morphTargets, headBone };

    // --- MASTER ANIMATION LOOP ---
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const deltaTime = clock.current.getDelta();

      // --- 1. IDLE & PROCEDURAL ANIMATION (Always running) ---
      if (morphTargets.mesh && headBone) {
        // --- Blinking ---
        const blinkMorphName = 'eyesClosed';
        if (morphTargets.dictionary?.[blinkMorphName] !== undefined) {
            const blinkIndex = morphTargets.dictionary[blinkMorphName];
            // Create a sine wave for blinking
            const blinkValue = (Math.sin(Date.now() / (BLINK_INTERVAL / 2)) > 0.98) ? 1 : 0;
            morphTargets.influences[blinkIndex] = THREE.MathUtils.lerp(morphTargets.influences[blinkIndex], blinkValue, 0.3);
        }

        // --- Subtle Head Movement ---
        headBone.rotation.y = Math.sin(Date.now() * 0.0005) * 0.1;
        headBone.rotation.x = Math.sin(Date.now() * 0.0003) * 0.05;
      }


      // --- 2. REAL-TIME LIP-SYNC (Only when audio is active) ---
      if (audioAnalyser.current && morphTargets.mesh) {
        const dataArray = new Uint8Array(audioAnalyser.current.frequencyBinCount);
        audioAnalyser.current.getByteFrequencyData(dataArray);

        // --- Advanced Frequency Mapping ---
        // Vowels (like 'ahh') are low frequency
        const lowFreq = (dataArray[1] + dataArray[2]) / 2;
        // Sibilants (like 'sss') are high frequency
        const highFreq = (dataArray[10] + dataArray[11]) / 2;
        // Plosives/Mids (like 'ooh', 'eee')
        const midFreq = (dataArray[5] + dataArray[6]) / 2;

        const jawOpen = THREE.MathUtils.mapLinear(lowFreq, 0, 180, 0, 1.0);
        const mouthFunnel = THREE.MathUtils.mapLinear(midFreq, 0, 150, 0, 0.8); // For 'O' sounds
        const mouthSmile = THREE.MathUtils.mapLinear(highFreq, 0, 120, 0, 0.5); // For 'E' sounds
        const browsUp = THREE.MathUtils.mapLinear(lowFreq, 100, 200, 0, 0.6); // Raise brows on loud sounds

        // --- Apply smoothed values to morph targets ---
        const applyMorph = (name, value) => {
            if (morphTargets.dictionary?.[name] !== undefined) {
                const index = morphTargets.dictionary[name];
                smoothedValues.current[name] = THREE.MathUtils.lerp(smoothedValues.current[name], value, SMOOTHING_FACTOR);
                morphTargets.influences[index] = smoothedValues.current[name];
            }
        };

        applyMorph('jawOpen', jawOpen);
        applyMorph('mouthFunnel', mouthFunnel); // O, U sounds
        applyMorph('mouthSmileLeft', mouthSmile); // E, S sounds
        applyMorph('mouthSmileRight', mouthSmile);
        applyMorph('browInnerUp', browsUp); // Add expression

      } else {
        // Decay all morph values back to 0 when not speaking
        if (morphTargets.mesh) {
            Object.keys(smoothedValues.current).forEach(key => {
                const index = morphTargets.dictionary?.[key];
                if (index !== undefined && key !== 'eyesClosed') { // Don't stop blinking
                    smoothedValues.current[key] = THREE.MathUtils.lerp(smoothedValues.current[key], 0, 0.1);
                    morphTargets.influences[index] = smoothedValues.current[key];
                }
            });
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // --- 6. Handle Resize ---
    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 7. Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId.current);
      container.removeChild(renderer.domElement);
    };
  }, [avatarUrl, containerRef]);

  // Effect to connect the audio stream for analysis
  useEffect(() => {
    if (stream) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioAnalyser.current = analyser;
    } else {
      audioAnalyser.current = null;
      // Reset jaw to closed position when not listening
      if (sceneElements.current?.morphTargets.mesh) {
          const { dictionary, influences } = sceneElements.current.morphTargets;
          if (dictionary?.jawOpen !== undefined) {
            influences[dictionary.jawOpen] = 0;
          }
      }
    }
  }, [stream]);
};
// frontend/src/components/translation/AudioVisualizer.jsx
import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader, AlertTriangle } from 'lucide-react';

const AudioVisualizer = ({ isListening, stream, status, onToggle }) => {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);

  useEffect(() => {
    if (!isListening || !stream) {
      const canvas = canvasRef.current;
      if (canvas) {
         const ctx = canvas.getContext('2d');
         ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    };

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7; // Smoother transitions
    source.connect(analyser);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const avg = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
      const radius = 40 + (avg / 2.5); // Base radius + dynamic part

      // Create a subtle gradient for the central orb
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(79, 70, 229, 0.7)');
      gradient.addColorStop(1, 'rgba(79, 70, 229, 0.1)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      source.disconnect();
      analyser.disconnect();
      // Ensure the context is closed only when it's appropriate
      if(audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [isListening, stream]);

  const statusConfig = {
    disconnected: { color: 'border-gray-500', icon: isListening ? MicOff : Mic },
    connecting: { color: 'border-yellow-500 animate-spin', icon: Loader },
    connected: { color: 'border-primary', icon: isListening ? MicOff : Mic },
    error: { color: 'border-red-500', icon: AlertTriangle },
  };

  const currentStatus = statusConfig[status] || statusConfig.disconnected;
  const buttonColor = isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
  const Icon = currentStatus.icon;

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Outer status ring */}
      <motion.div
        className={`absolute w-full h-full rounded-full border-4 ${currentStatus.color} transition-colors`}
        animate={{ scale: isListening ? 1 : 0.8, opacity: isListening ? 1 : 0.5 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
       {/* Inner pulsing ring */}
      <motion.div
        className="absolute w-full h-full rounded-full border-2 border-primary/50"
        animate={{
          scale: isListening ? [1, 1.2, 1] : 0.8,
          opacity: isListening ? [0.8, 0, 0.8] : 0
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <canvas ref={canvasRef} width="200" height="200" className="absolute" />

      {/* Central Control Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        disabled={status === 'connecting'}
        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${buttonColor} disabled:bg-gray-500`}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
      >
        <Icon size={32} />
      </motion.button>
    </div>
  );
};

AudioVisualizer.propTypes = {
  isListening: PropTypes.bool.isRequired,
  stream: PropTypes.instanceOf(MediaStream),
  status: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default AudioVisualizer;
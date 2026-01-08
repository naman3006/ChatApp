import React, { useState, useRef, useEffect } from 'react';

const VoiceMessage = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    // Generate random bar heights once for the "waveform" look
    const [bars] = useState(() => Array.from({ length: 40 }, () => Math.floor(Math.random() * 40) + 10));

    useEffect(() => {
        if (src) {
            console.log("VoiceMessage src:", src);
        }
    }, [src]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            setCurrentTime(audio.currentTime);
            setProgress((audio.currentTime / audio.duration) * 100);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(100);
            setCurrentTime(duration);
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);


        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [duration]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            if (progress === 100) {
                audio.currentTime = 0;
            }
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? "0" : ""}${sec}`;
    };

    return (
        <div className="flex items-center gap-3 p-2 min-w-[200px]">
            <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

            <button
                onClick={togglePlay}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-violet-600 hover:scale-110 transition-transform shadow-sm"
            >
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5 3l14 9-14 9V3z" /></svg>
                )}
            </button>

            <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-0.5 h-8">
                    {bars.map((height, index) => {
                        const barPercent = (index / bars.length) * 100;
                        const isPlayed = barPercent < progress;
                        return (
                            <div
                                key={index}
                                className={`w-1 rounded-full transition-colors duration-200 ${isPlayed ? 'bg-white' : 'bg-white/40'}`}
                                style={{ height: `${height}%` }}
                            />
                        )
                    })}
                </div>
                <div className="flex justify-between text-[10px] text-white/80 font-mono tracking-wider">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default VoiceMessage;

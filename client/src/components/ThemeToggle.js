import React, { useState, useRef, useEffect } from "react";
import { Moon, Sun, Check, Laptop } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle({ className }) {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const themeOptions = [
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
        { value: "system", label: "System", icon: Laptop }, // Using Laptop instead of Monitor
    ];

    const currentIcon = () => {
        if (theme === 'light') return <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500 transition-all" />;
        if (theme === 'dark') return <Moon className="h-[1.2rem] w-[1.2rem] text-blue-400 transition-all" />;
        return <Laptop className="h-[1.2rem] w-[1.2rem] text-gray-400 transition-all" />;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`rounded-full p-2 transition-all ${className || 'bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground border border-border/10 shadow-sm'}`}
                title="Change Appearance"
            >
                <div className="relative w-5 h-5 flex items-center justify-center">
                    {currentIcon()}
                </div>
                <span className="sr-only">Toggle theme</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-popover text-popover-foreground border border-border shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                        {themeOptions.map((option) => {
                            const Icon = option.icon;
                            const isActive = theme === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setTheme(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                                >
                                    <Icon size={16} />
                                    <span>{option.label}</span>
                                    {isActive && <Check size={14} className="ml-auto text-primary" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

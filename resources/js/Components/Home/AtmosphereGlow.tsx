export function AtmosphereGlow() {
    return (
        <>
            {/* Wide diffuse corona — bleeds into the text side */}
            <div className="atmosphere-glow-wide absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" aria-hidden="true" />
            {/* Main atmosphere pulse */}
            <div className="atmosphere-glow absolute left-1/2 top-1/2 size-[82vw] max-h-[52rem] max-w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full" aria-hidden="true" />
            {/* Inner hot core — tighter, more saturated */}
            <div className="absolute left-1/2 top-1/2 size-[48vw] max-h-[28rem] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(84,214,214,0.18)_0%,rgba(40,120,180,0.10)_38%,transparent_70%)] blur-[56px] transition duration-700 group-hover/earth:opacity-90" aria-hidden="true" />
        </>
    );
}

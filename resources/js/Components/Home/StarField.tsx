export function StarField() {
    return (
        <>
            <div className="star-field cinematic-stars pointer-events-none absolute inset-0 opacity-45" aria-hidden="true" />
            <div className="star-field cinematic-stars-near pointer-events-none absolute inset-0 opacity-35" aria-hidden="true" />
        </>
    );
}

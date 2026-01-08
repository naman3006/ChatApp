export function formatMessageTime(date) {
    return new Date(date).toLocaleTimeString("en-us", {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })
}

export function formatLastSeen(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dayDate = date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
    // Format: "Last seen at HH:mm on DD/MM/YYYY" as per common conventions, or "HH:mm DD/MM/YYYY"
    return `Last seen at ${time} on ${dayDate}`;
}

export function convertToPeriodEndDate(date) {
    // Ignores Time
    return new Date(new Date(new Date(date).setDate(new Date(date).getDate() + 7 - getDay(date))).setHours(0,0,0,0))
}

function getDay(date) {
    // Returns 1 Monday to 7 Sunday
    let day = new Date(date).getDay()
    switch (day) {
        case 0:
            return 7
        default:
            return day 
    }
}
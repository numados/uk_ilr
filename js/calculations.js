// Pure calculation helpers for UK ILR absence tracking.
// No DOM access — safe to reuse, test, or reference for review.

const MAX_ABSENCE_DAYS = 180;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function toDateOnly(date) {
    if (!date) return null;
    if (typeof date === 'string') {
        return parseDate(date);
    }
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
    const result = toDateOnly(date);
    result.setDate(result.getDate() + days);
    return result;
}

function addYears(date, years) {
    const result = toDateOnly(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}

function getInclusiveDays(startDate, endDate) {
    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);
    if (!start || !end || start > end) return 0;
    return Math.round((end - start) / MS_PER_DAY) + 1;
}

function getTripAbsenceRange(trip, referenceDate) {
    const depDate = toDateOnly(trip.departure);
    const endDate = trip.return ? addDays(trip.return, -1) : toDateOnly(referenceDate);
    const startDate = addDays(depDate, 1);

    if (!depDate || !endDate || startDate > endDate) {
        return null;
    }

    return { startDate, endDate };
}

function calculateTripAbsenceDays(trip, referenceDate) {
    const absenceRange = getTripAbsenceRange(trip, referenceDate);
    if (!absenceRange) return 0;
    return getInclusiveDays(absenceRange.startDate, absenceRange.endDate);
}

// Absence days within a rolling 12-month window ending at referenceDate.
function calculateRollingAbsence(trips, referenceDate) {
    const refDate = toDateOnly(referenceDate);
    const rollingYearStart = addDays(addYears(refDate, -1), 1);

    let totalAbsenceDays = 0;

    trips.forEach(trip => {
        const absenceRange = getTripAbsenceRange(trip, refDate);
        if (!absenceRange) return;

        const startCount = absenceRange.startDate > rollingYearStart ? absenceRange.startDate : rollingYearStart;
        const endCount = absenceRange.endDate < refDate ? absenceRange.endDate : refDate;

        if (startCount <= endCount) {
            totalAbsenceDays += getInclusiveDays(startCount, endCount);
        }
    });

    return totalAbsenceDays;
}

// Worst rolling 12-month window between firstEntryDate and referenceDate.
function calculateWorstRollingAbsence(trips, firstEntryDate, referenceDate) {
    const startDate = toDateOnly(firstEntryDate);
    const endDate = toDateOnly(referenceDate);
    if (!startDate || !endDate || startDate > endDate) {
        return { days: 0, startDate: null, endDate: null, exceedsLimit: false };
    }

    let worstWindow = {
        days: 0,
        startDate,
        endDate: startDate,
        exceedsLimit: false
    };

    for (let windowEnd = new Date(startDate); windowEnd <= endDate; windowEnd = addDays(windowEnd, 1)) {
        const days = calculateRollingAbsence(trips, windowEnd);
        if (days > worstWindow.days) {
            worstWindow = {
                days,
                startDate: addDays(addYears(windowEnd, -1), 1),
                endDate: new Date(windowEnd),
                exceedsLimit: days > MAX_ABSENCE_DAYS
            };
        }
    }

    return worstWindow;
}

function calculateTotalAbsence(trips, referenceDate) {
    const refDate = new Date(referenceDate);
    let totalAbsenceDays = 0;
    trips.forEach(trip => {
        totalAbsenceDays += calculateTripAbsenceDays(trip, refDate);
    });
    return totalAbsenceDays;
}

function calculateDaysUntilReduction(trips, referenceDate) {
    if (!trips || trips.length === 0) return 0;

    const refDate = toDateOnly(referenceDate);
    const rollingYearStart = addDays(addYears(refDate, -1), 1);

    const sortedTrips = [...trips].sort((a, b) => new Date(a.departure) - new Date(b.departure));

    for (const trip of sortedTrips) {
        const absenceRange = getTripAbsenceRange(trip, refDate);
        if (!absenceRange || absenceRange.startDate > refDate || absenceRange.endDate < rollingYearStart) {
            continue;
        }
        const earliestCountedDate = absenceRange.startDate > rollingYearStart ? absenceRange.startDate : rollingYearStart;
        return getInclusiveDays(rollingYearStart, earliestCountedDate);
    }

    return 0;
}

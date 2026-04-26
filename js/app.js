// Initialize profiles globally
let profiles = {};
let currentProfile = null;
const MAX_ABSENCE_DAYS = 180;
const DAYS_IN_FIVE_YEARS = 365 * 5 + 1; // Add 1 for leap year
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Minimal localStorage-based implementations:

async function loadProfilesFromDirectory() {
    const storedProfiles = localStorage.getItem('ilrProfiles');
    return storedProfiles ? JSON.parse(storedProfiles) : {};
}

async function saveProfileToFile(profileName, profileData) {
    // Load existing profiles from localStorage
    let allProfiles = localStorage.getItem('ilrProfiles');
    allProfiles = allProfiles ? JSON.parse(allProfiles) : {};

    // Update the specific profile
    allProfiles[profileName] = profileData;

    // Write back to localStorage
    localStorage.setItem('ilrProfiles', JSON.stringify(allProfiles));
}

async function deleteProfileFile(profileName) {
    let allProfiles = localStorage.getItem('ilrProfiles');
    allProfiles = allProfiles ? JSON.parse(allProfiles) : {};

    // Remove the specified profile
    delete allProfiles[profileName];

    // Save updated profiles back to localStorage
    localStorage.setItem('ilrProfiles', JSON.stringify(allProfiles));
}

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const profileSelect = document.getElementById('profile-select');
    const newProfileName = document.getElementById('new-profile-name');
    const createProfileBtn = document.getElementById('create-profile-btn');
    const refreshProfilesBtn = document.getElementById('refresh-profiles-btn');
    const profileDetails = document.getElementById('profile-details');
    const firstEntryDate = document.getElementById('first-entry-date');
    const currentDateInput = document.getElementById('current-date');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    const tripFormContainer = document.getElementById('trip-form-container');
    const departureDate = document.getElementById('departure-date');
    const returnDate = document.getElementById('return-date');
    const addTripBtn = document.getElementById('add-trip-btn');
    const absenceSummary = document.getElementById('absence-summary');
    const absenceLast12Months = document.getElementById('absence-last-12-months');
    const remainingDays = document.getElementById('remaining-days');
    const totalAbsence = document.getElementById('total-absence');
    const timelineVisualization = document.getElementById('timeline-visualization');
    const timelineContainer = document.getElementById('timeline-container');
    const tripsListContainer = document.getElementById('trips-list-container');
    const tripsList = document.getElementById('trips-list');
    const noTripsMessage = document.getElementById('no-trips-message');
    const timelineLength = document.getElementById('timeline-length');

    // Set the current date input to today by default
    const today = new Date();
    currentDateInput.value = formatDateForInput(today);

    // Load profiles from directory
    async function loadProfiles() {
        try {
            // Use the File System Access API to load profiles
            profiles = await loadProfilesFromDirectory();
            updateProfileSelect();
        } catch (err) {
            console.error('Error loading profiles:', err);
            profiles = {};
            updateProfileSelect();
        }
    }

    // Save profiles to local directory
    async function saveProfiles() {
        // For each profile, save as JSON file in the profiles directory
        for (const [profileName, profileData] of Object.entries(profiles)) {
            await saveProfileToFile(profileName, profileData);
        }
    }

    // Update profile dropdown
    function updateProfileSelect() {
        profileSelect.innerHTML = '<option value="">Select a profile</option>';
        Object.keys(profiles).forEach(profileName => {
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName;
            profileSelect.appendChild(option);
        });
    }

    // Format date for input fields (YYYY-MM-DD)
    function formatDateForInput(date) {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    // Parse date from input (YYYY-MM-DD to Date object)
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

    // Format date for display (DD.MM.YYYY)
    function formatDateForDisplay(date) {
        const d = new Date(date);
        return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
    }

    // Calculate days between two dates (inclusive)
    function getDaysBetween(startDate, endDate) {
        return getInclusiveDays(startDate, endDate);
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

    // Calculate absence days in a rolling 12-month period
    function calculateRollingAbsence(trips, referenceDate) {
        const refDate = toDateOnly(referenceDate);
        const rollingYearStart = addDays(addYears(refDate, -1), 1); // Start from the next day of the same date one year ago

        let totalAbsenceDays = 0;

        trips.forEach(trip => {
            const absenceRange = getTripAbsenceRange(trip, refDate);
            if (!absenceRange) {
                return;
            }

            // Calculate overlap with the rolling period
            const startCount = absenceRange.startDate > rollingYearStart ? absenceRange.startDate : rollingYearStart;
            const endCount = absenceRange.endDate < refDate ? absenceRange.endDate : refDate;

            if (startCount <= endCount) {
                totalAbsenceDays += getInclusiveDays(startCount, endCount);
            }
        });

        return totalAbsenceDays;
    }

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

    // Calculate total absence since first entry
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
        
        // Sort trips by departure date (oldest first)
        const sortedTrips = [...trips].sort((a, b) => new Date(a.departure) - new Date(b.departure));
        
        // Find the earliest trip that affects the current rolling window
        for (const trip of sortedTrips) {
            const absenceRange = getTripAbsenceRange(trip, refDate);
            if (!absenceRange || absenceRange.startDate > refDate || absenceRange.endDate < rollingYearStart) {
                continue;
            }

            const earliestCountedDate = absenceRange.startDate > rollingYearStart ? absenceRange.startDate : rollingYearStart;
            return getInclusiveDays(rollingYearStart, earliestCountedDate);
        }
        
        return 0; // No trips found that would reduce the count when the window moves
    }

    // Create the timeline visualization
    function createTimeline(firstEntry, currentDate, trips) {
        timelineContainer.innerHTML = '';

        const startDate = toDateOnly(new Date(firstEntry));
        const endDate = new Date(startDate);
        const years = parseInt(timelineLength.value) || 5;
        endDate.setFullYear(endDate.getFullYear() + years);

        const today = toDateOnly(currentDate);
        const rollingWindowEnd = today;
        const rollingWindowStart = addDays(addYears(rollingWindowEnd, -1), 1);

        // Build day-by-day status array
        const dateArray = [];
        let cur = new Date(startDate);
        while (cur <= endDate) {
            let isAbsent = false;
            for (const trip of trips) {
                const r = getTripAbsenceRange(trip, today);
                if (r && cur >= r.startDate && cur <= r.endDate) { isAbsent = true; break; }
            }
            const t = cur.getTime();
            dateArray.push({
                date: new Date(cur),
                isAbsent,
                isFutureDate: cur > today,
                isInRollingWindow: cur >= rollingWindowStart && cur <= rollingWindowEnd,
                isRollingWindowStart: t === rollingWindowStart.getTime(),
                isRollingWindowEnd: t === rollingWindowEnd.getTime(),
                isToday: t === today.getTime()
            });
            cur.setDate(cur.getDate() + 1);
        }

        // ===== Floating tooltip used by both chart and strip =====
        const floatingTip = document.createElement('div');
        floatingTip.className = 'timeline-tooltip';
        timelineContainer.appendChild(floatingTip);

        // ===== Trailing 12-month absence chart =====
        timelineContainer.appendChild(buildTrailing12Chart(dateArray, today, floatingTip, timelineContainer));

        // ===== Year-per-row strip =====
        const strip = document.createElement('div');
        strip.className = 'year-strip';

        const byYear = new Map();
        for (const d of dateArray) {
            const y = d.date.getFullYear();
            if (!byYear.has(y)) byYear.set(y, []);
            byYear.get(y).push(d);
        }
        const sortedYears = [...byYear.keys()].sort((a, b) => a - b);
        const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        for (const y of sortedYears) {
            const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
            const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            const days = byYear.get(y);

            const row = document.createElement('div');
            row.className = 'year-row';

            const yearLabel = document.createElement('div');
            yearLabel.className = 'year-row-label';
            yearLabel.textContent = y;
            row.appendChild(yearLabel);

            const content = document.createElement('div');
            content.className = 'year-row-content';

            // Month-name header (flex weighted by days in month)
            const monthLabels = document.createElement('div');
            monthLabels.className = 'month-labels';
            for (let m = 0; m < 12; m++) {
                const span = document.createElement('span');
                span.textContent = monthShort[m];
                span.style.flex = `${daysInMonth[m]} 0 0`;
                monthLabels.appendChild(span);
            }
            content.appendChild(monthLabels);

            // Day boxes
            const daysWrap = document.createElement('div');
            daysWrap.className = 'year-row-days';

            // Pad with empty boxes if year doesn't start on Jan 1 (only the very first year)
            const firstDay = days[0].date;
            const startOffset = dayOfYear(firstDay) - 1;
            for (let p = 0; p < startOffset; p++) {
                const empty = document.createElement('div');
                empty.className = 'day-box day-empty';
                daysWrap.appendChild(empty);
            }

            for (const di of days) {
                const dayBox = document.createElement('div');
                dayBox.className = 'day-box';
                dayBox.dataset.date = formatDateForDisplay(di.date);
                dayBox.dataset.status = di.isFutureDate ? 'Future' : (di.isAbsent ? 'Absent' : 'Present');
                if (di.isFutureDate) dayBox.classList.add('day-future');
                else if (di.isAbsent) dayBox.classList.add('day-absent');
                else dayBox.classList.add('day-present');

                if (di.isInRollingWindow) {
                    dayBox.classList.add('day-rolling-window');
                    if (di.isRollingWindowStart) dayBox.classList.add('day-rolling-window-start');
                    if (di.isRollingWindowEnd) dayBox.classList.add('day-rolling-window-end');
                }
                if (di.isToday) dayBox.classList.add('day-today');

                daysWrap.appendChild(dayBox);
            }

            attachStripHover(daysWrap, floatingTip, timelineContainer);

            content.appendChild(daysWrap);
            row.appendChild(content);
            strip.appendChild(row);
        }

        timelineContainer.appendChild(strip);
    }

    function attachStripHover(daysWrap, tip, anchor) {
        daysWrap.addEventListener('mousemove', (e) => {
            const target = e.target.closest('.day-box');
            if (!target || target.classList.contains('day-empty') || !target.dataset.date) {
                tip.style.opacity = '0';
                return;
            }
            const status = target.dataset.status;
            const dot = status === 'Absent' ? '#ef4444' : status === 'Present' ? '#10b981' : '#9ca3af';
            tip.innerHTML = `<span class="tt-dot" style="background:${dot}"></span><span class="tt-date">${target.dataset.date}</span><span class="tt-meta">${status}</span>`;
            positionTooltip(tip, anchor, e);
        });
        daysWrap.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
    }

    function positionTooltip(tip, anchor, e) {
        const aRect = anchor.getBoundingClientRect();
        const x = e.clientX - aRect.left;
        const y = e.clientY - aRect.top;
        tip.style.opacity = '1';
        tip.style.left = `${x}px`;
        tip.style.top = `${y - 14}px`;
    }

    function dayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // Trailing 12-month absence count line chart (SVG)
    function buildTrailing12Chart(dateArray, today, tip, anchor) {
        const wrap = document.createElement('div');
        wrap.className = 'trailing-chart';

        const n = dateArray.length;
        const counts = new Array(n);
        let absent = 0;
        const W365 = 365;
        for (let i = 0; i < n; i++) {
            if (dateArray[i].isAbsent) absent++;
            if (i - W365 >= 0 && dateArray[i - W365].isAbsent) absent--;
            counts[i] = dateArray[i].isFutureDate ? null : absent;
        }

        const W = 1000, H = 200;
        const padL = 36, padR = 16, padT = 18, padB = 28;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;
        const maxY = 200;
        const x = i => padL + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
        const y = v => padT + plotH - (v / maxY) * plotH;

        let linePath = '';
        let areaPath = '';
        let started = false;
        let lastValidI = -1;
        let lastValidV = 0;
        for (let i = 0; i < n; i++) {
            if (counts[i] === null) break;
            const xi = x(i), yi = y(counts[i]);
            if (!started) { linePath = `M ${xi} ${yi}`; areaPath = `M ${xi} ${y(0)} L ${xi} ${yi}`; started = true; }
            else { linePath += ` L ${xi} ${yi}`; areaPath += ` L ${xi} ${yi}`; }
            lastValidI = i; lastValidV = counts[i];
        }
        if (started) areaPath += ` L ${x(lastValidI)} ${y(0)} Z`;

        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.classList.add('trailing-svg');

        // Defs (gradient)
        const defs = document.createElementNS(ns, 'defs');
        const grad = document.createElementNS(ns, 'linearGradient');
        grad.setAttribute('id', 'trailingGrad');
        grad.setAttribute('x1', '0'); grad.setAttribute('x2', '0');
        grad.setAttribute('y1', '0'); grad.setAttribute('y2', '1');
        const s1 = document.createElementNS(ns, 'stop');
        s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#6366f1'); s1.setAttribute('stop-opacity', '0.35');
        const s2 = document.createElementNS(ns, 'stop');
        s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#6366f1'); s2.setAttribute('stop-opacity', '0.02');
        grad.appendChild(s1); grad.appendChild(s2);
        defs.appendChild(grad);
        svg.appendChild(defs);

        // Y-axis grid + labels
        [0, 50, 100, 150, 180].forEach(v => {
            const ln = document.createElementNS(ns, 'line');
            ln.setAttribute('x1', padL); ln.setAttribute('x2', W - padR);
            ln.setAttribute('y1', y(v)); ln.setAttribute('y2', y(v));
            ln.setAttribute('stroke', v === 180 ? '#ef4444' : '#e2e8f0');
            ln.setAttribute('stroke-width', v === 180 ? 1.5 : 1);
            if (v === 180) ln.setAttribute('stroke-dasharray', '6 4');
            svg.appendChild(ln);
            const lbl = document.createElementNS(ns, 'text');
            lbl.setAttribute('x', padL - 6); lbl.setAttribute('y', y(v) + 3);
            lbl.setAttribute('text-anchor', 'end');
            lbl.setAttribute('font-size', '10');
            lbl.setAttribute('fill', v === 180 ? '#ef4444' : '#94a3b8');
            lbl.textContent = v;
            svg.appendChild(lbl);
        });
        const limitLabel = document.createElementNS(ns, 'text');
        limitLabel.setAttribute('x', W - padR - 4); limitLabel.setAttribute('y', y(180) - 4);
        limitLabel.setAttribute('text-anchor', 'end'); limitLabel.setAttribute('font-size', '10');
        limitLabel.setAttribute('font-weight', '600'); limitLabel.setAttribute('fill', '#ef4444');
        limitLabel.textContent = '180-day limit';
        svg.appendChild(limitLabel);

        // X-axis year ticks
        for (let i = 0; i < n; i++) {
            const d = dateArray[i].date;
            if (d.getMonth() === 0 && d.getDate() === 1) {
                const tx = x(i);
                const tl = document.createElementNS(ns, 'line');
                tl.setAttribute('x1', tx); tl.setAttribute('x2', tx);
                tl.setAttribute('y1', padT); tl.setAttribute('y2', H - padB);
                tl.setAttribute('stroke', '#e2e8f0');
                svg.appendChild(tl);
                const txt = document.createElementNS(ns, 'text');
                txt.setAttribute('x', tx); txt.setAttribute('y', H - padB + 14);
                txt.setAttribute('text-anchor', 'middle');
                txt.setAttribute('font-size', '11'); txt.setAttribute('font-weight', '600');
                txt.setAttribute('fill', '#475569');
                txt.textContent = d.getFullYear();
                svg.appendChild(txt);
            }
        }

        // Area + line
        if (areaPath) {
            const ap = document.createElementNS(ns, 'path');
            ap.setAttribute('d', areaPath); ap.setAttribute('fill', 'url(#trailingGrad)');
            svg.appendChild(ap);
        }
        if (linePath) {
            const lp = document.createElementNS(ns, 'path');
            lp.setAttribute('d', linePath); lp.setAttribute('fill', 'none');
            lp.setAttribute('stroke', '#4f46e5'); lp.setAttribute('stroke-width', '2');
            lp.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(lp);
        }

        // Today marker
        let todayI = -1;
        for (let i = 0; i < n; i++) {
            if (dateArray[i].date.getTime() === today.getTime()) { todayI = i; break; }
        }
        if (todayI >= 0 && counts[todayI] !== null) {
            const tx = x(todayI);
            const tline = document.createElementNS(ns, 'line');
            tline.setAttribute('x1', tx); tline.setAttribute('x2', tx);
            tline.setAttribute('y1', padT); tline.setAttribute('y2', H - padB);
            tline.setAttribute('stroke', '#0f172a'); tline.setAttribute('stroke-width', 1);
            tline.setAttribute('stroke-dasharray', '3 3');
            svg.appendChild(tline);
            const dot = document.createElementNS(ns, 'circle');
            dot.setAttribute('cx', tx); dot.setAttribute('cy', y(counts[todayI]));
            dot.setAttribute('r', 4); dot.setAttribute('fill', '#4f46e5');
            dot.setAttribute('stroke', 'white'); dot.setAttribute('stroke-width', 2);
            svg.appendChild(dot);
        }

        // Hover overlay: vertical guide line + dot + tooltip
        const hoverLine = document.createElementNS(ns, 'line');
        hoverLine.setAttribute('y1', padT); hoverLine.setAttribute('y2', H - padB);
        hoverLine.setAttribute('stroke', '#475569'); hoverLine.setAttribute('stroke-width', '1');
        hoverLine.setAttribute('opacity', '0');
        svg.appendChild(hoverLine);
        const hoverDot = document.createElementNS(ns, 'circle');
        hoverDot.setAttribute('r', '4'); hoverDot.setAttribute('fill', '#4f46e5');
        hoverDot.setAttribute('stroke', 'white'); hoverDot.setAttribute('stroke-width', '2');
        hoverDot.setAttribute('opacity', '0');
        svg.appendChild(hoverDot);

        if (tip && anchor) {
            svg.addEventListener('mousemove', (e) => {
                const r = svg.getBoundingClientRect();
                const vbX = ((e.clientX - r.left) / r.width) * W;
                if (vbX < padL || vbX > W - padR) {
                    hoverLine.setAttribute('opacity', '0');
                    hoverDot.setAttribute('opacity', '0');
                    tip.style.opacity = '0';
                    return;
                }
                let i = Math.round(((vbX - padL) / plotW) * (n - 1));
                if (i < 0) i = 0; if (i >= n) i = n - 1;
                if (counts[i] === null) {
                    while (i > 0 && counts[i] === null) i--;
                }
                const tx = x(i);
                const ty = counts[i] !== null ? y(counts[i]) : y(0);
                hoverLine.setAttribute('x1', tx); hoverLine.setAttribute('x2', tx);
                hoverLine.setAttribute('opacity', '1');
                hoverDot.setAttribute('cx', tx); hoverDot.setAttribute('cy', ty);
                hoverDot.setAttribute('opacity', '1');
                const v = counts[i];
                const dColor = v == null ? '#9ca3af' : (v > 180 ? '#ef4444' : v > 150 ? '#f59e0b' : '#10b981');
                tip.innerHTML =
                    `<span class="tt-dot" style="background:${dColor}"></span>` +
                    `<span class="tt-date">${formatDateForDisplay(dateArray[i].date)}</span>` +
                    `<span class="tt-meta">${v == null ? 'future' : v + ' days absent · trailing 12mo'}</span>`;
                positionTooltip(tip, anchor, e);
            });
            svg.addEventListener('mouseleave', () => {
                hoverLine.setAttribute('opacity', '0');
                hoverDot.setAttribute('opacity', '0');
                tip.style.opacity = '0';
            });
        }

        const title = document.createElement('div');
        title.className = 'trailing-chart-title';
        title.innerHTML = 'Trailing 12-month absence days <span>· each point = days outside UK in the prior 365 days</span>';
        wrap.appendChild(title);
        wrap.appendChild(svg);
        return wrap;
    }

    // Update the trips table
    function updateTripsTable(trips, currentDate) {
        tripsList.innerHTML = '';
        
        if (trips.length === 0) {
            noTripsMessage.style.display = 'block';
            return;
        }
        
        noTripsMessage.style.display = 'none';
        
        // Map trips with their original index, then sort by departure date (newest first)
        const sortedTrips = trips
          .map((trip, originalIndex) => ({ trip, originalIndex }))
          .sort((a, b) => new Date(b.trip.departure) - new Date(a.trip.departure));
        
        sortedTrips.forEach(({ trip, originalIndex }) => {
            const row = document.createElement('tr');
            
            // Departure date
            const depCell = document.createElement('td');
            depCell.className = 'px-6 py-4 whitespace-nowrap';
            depCell.textContent = formatDateForDisplay(trip.departure);
            row.appendChild(depCell);
            
            // Return date
            const retCell = document.createElement('td');
            retCell.className = 'px-6 py-4 whitespace-nowrap';
            if (trip.return) {
                retCell.textContent = formatDateForDisplay(trip.return);
            } else {
                retCell.innerHTML = '<span class="text-yellow-500">Not returned yet</span>';
            }
            row.appendChild(retCell);
            
            // Days absent
            const daysCell = document.createElement('td');
            daysCell.className = 'px-6 py-4 whitespace-nowrap';
            const daysAbsent = calculateTripAbsenceDays(trip, currentDate);
            daysCell.textContent = daysAbsent;
            row.appendChild(daysCell);
            
            // Status
            const statusCell = document.createElement('td');
            statusCell.className = 'px-6 py-4 whitespace-nowrap';
            if (!trip.return) {
                statusCell.innerHTML = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Active</span>';
            } else {
                statusCell.innerHTML = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>';
            }
            row.appendChild(statusCell);
            
            // Actions
            const actionsCell = document.createElement('td');
            actionsCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium';
            
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'text-indigo-600 hover:text-indigo-900 mr-2';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => editTrip(originalIndex));
            actionsCell.appendChild(editBtn);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-red-600 hover:text-red-900';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteTrip(originalIndex));
            actionsCell.appendChild(deleteBtn);
            
            row.appendChild(actionsCell);
            
            tripsList.appendChild(row);
        });
    }

    // Edit a trip
    function editTrip(index) {
        const trip = currentProfile.trips[index];
        
        // Show the trip form and populate it
        departureDate.value = formatDateForInput(trip.departure);
        returnDate.value = trip.return ? formatDateForInput(trip.return) : '';
        
        // Store the index to identify which trip to update
        addTripBtn.dataset.editIndex = index;
        addTripBtn.textContent = 'Update Trip';
    }

    // Delete a trip
    async function deleteTrip(index) {
        if (confirm('Are you sure you want to delete this trip?')) {
            currentProfile.trips.splice(index, 1);
            await saveProfileToFile(profileSelect.value, currentProfile);
            refreshUI();
        }
    }

    // Update the summary section
    function updateSummary(rollingAbsence, daysUntilReduction, worstWindow) {
        const remainingDaysValue = MAX_ABSENCE_DAYS - rollingAbsence;
        
        absenceLast12Months.textContent = rollingAbsence;
        remainingDays.textContent = remainingDaysValue;
        
        // Update the progress bar
        const remainingDaysBar = document.getElementById('remaining-days-bar');
        const percentRemaining = Math.max(0, Math.min(100, (remainingDaysValue / MAX_ABSENCE_DAYS) * 100));
        remainingDaysBar.style.width = `${percentRemaining}%`;
        
        // Change color based on remaining days
        if (percentRemaining > 66) {
            remainingDaysBar.classList.remove('bg-yellow-500', 'bg-red-500');
            remainingDaysBar.classList.add('bg-green-500');
        } else if (percentRemaining > 33) {
            remainingDaysBar.classList.remove('bg-green-500', 'bg-red-500');
            remainingDaysBar.classList.add('bg-yellow-500');
        } else {
            remainingDaysBar.classList.remove('bg-green-500', 'bg-yellow-500');
            remainingDaysBar.classList.add('bg-red-500');
        }
        
        // Update days until reduction
        document.getElementById('days-until-reduction').textContent = daysUntilReduction;

        const worstRollingAbsence = document.getElementById('worst-rolling-absence');
        const worstWindowDetail = document.getElementById('worst-window-detail');
        if (worstWindow && worstWindow.days > 0 && worstWindow.startDate && worstWindow.endDate) {
            worstRollingAbsence.textContent = worstWindow.days;
            const windowDates = `${formatDateForDisplay(worstWindow.startDate)} - ${formatDateForDisplay(worstWindow.endDate)}`;
            worstWindowDetail.textContent = worstWindow.exceedsLimit ? `Exceeded: ${windowDates}` : windowDates;
            worstRollingAbsence.classList.toggle('text-red-600', worstWindow.exceedsLimit);
        } else {
            worstRollingAbsence.textContent = '0';
            worstWindowDetail.textContent = 'No absences recorded';
            worstRollingAbsence.classList.remove('text-red-600');
        }
        
        // Calculate and update total time in UK
        if (currentProfile && currentProfile.firstEntry) {
            const currDate = parseDate(currentDateInput.value) || new Date();
            const totalTime = calculateTotalTimeInUK(currentProfile.firstEntry, currDate, currentProfile.trips);
            
            // Calculate total days since first entry
            const totalDaysSinceFirstEntry = getDaysBetween(currentProfile.firstEntry, currDate) - 1;
            
            const totalTimeElement = document.getElementById('total-time');
            const totalTimeDetailElement = document.getElementById('total-time-detail');
            
            // Format as "days in UK / total days since first entry"
            totalTimeElement.textContent = `${totalTime.totalDays}/${totalDaysSinceFirstEntry}`;
            
            // Convert totalDaysSinceFirstEntry to years and days
            const totalYearsSinceEntry = Math.floor(totalDaysSinceFirstEntry / 365);
            const totalRemainingDaysSinceEntry = totalDaysSinceFirstEntry % 365;
            
            totalTimeDetailElement.textContent = `of ${totalYearsSinceEntry} year${totalYearsSinceEntry !== 1 ? 's' : ''} and ${totalRemainingDaysSinceEntry} day${totalRemainingDaysSinceEntry !== 1 ? 's' : ''} since entry`;
        }
    }

    function calculateTotalTimeInUK(firstEntryDate, currentDate, trips) {
        const startDate = new Date(firstEntryDate);
        const endDate = new Date(currentDate);
        
        // Total time in days between first entry and current date
        const totalDays = getDaysBetween(startDate, endDate) - 1; // Subtract 1 because getDaysBetween includes both days
        
        // Calculate total days absent
        const totalAbsenceDays = calculateTotalAbsence(trips, currentDate);
        
        // Time present in UK = total time - time absent
        const daysInUK = totalDays - totalAbsenceDays;
        
        // Convert to years and days
        const years = Math.floor(daysInUK / 365);
        const remainingDays = daysInUK % 365;
        
        return { 
            totalDays: daysInUK,
            years,
            remainingDays
        };
    }

    // Refresh the UI based on the current profile
    function refreshUI() {
        if (!currentProfile) return;
        
        const currDate = parseDate(currentDateInput.value) || new Date();
  
        // Update trips table
        updateTripsTable(currentProfile.trips, currDate);
        
        // Calculate absence days
        const rollingAbsence = calculateRollingAbsence(currentProfile.trips, currDate);
        const daysUntilReduction = calculateDaysUntilReduction(currentProfile.trips, currDate);
        const worstWindow = calculateWorstRollingAbsence(currentProfile.trips, currentProfile.firstEntry, currDate);
        
        // Update summary
        updateSummary(rollingAbsence, daysUntilReduction, worstWindow);
 
        // Create timeline
        createTimeline(currentProfile.firstEntry, currDate, currentProfile.trips);
    }

    // Event Listeners
    // Create profile button
    createProfileBtn.addEventListener('click', async function() {
        console.log("Create Profile button clicked");
        const profileName = newProfileName.value.trim();
        
        if (profileName === '') {
            alert('Please enter a profile name.');
            return;
        }
        
        if (profiles[profileName]) {
            alert('A profile with this name already exists.');
            return;
        }
        
        // Create new profile
        profiles[profileName] = {
            firstEntry: null,
            trips: []
        };
        
        // Save the profile to file system
        await saveProfileToFile(profileName, profiles[profileName]);
        
        // Update the UI
        updateProfileSelect();
        profileSelect.value = profileName;
        profileSelect.dispatchEvent(new Event('change'));
        newProfileName.value = '';
        
        alert(`Profile "${profileName}" created successfully.`);
    });

    // Profile select change
    profileSelect.addEventListener('change', () => {
        const selectedProfile = profileSelect.value;
        if (selectedProfile === '') {
            profileDetails.style.display = 'none';
            tripFormContainer.style.display = 'none';
            absenceSummary.style.display = 'none';
            timelineVisualization.style.display = 'none';
            tripsListContainer.style.display = 'none';
            currentProfile = null;
            return;
        }
        
        currentProfile = profiles[selectedProfile];
        profileDetails.style.display = 'block';
        
        // Populate first entry date if available
        if (currentProfile.firstEntry) {
            firstEntryDate.value = formatDateForInput(currentProfile.firstEntry);
            tripFormContainer.style.display = 'block';
            absenceSummary.style.display = 'block';
            timelineVisualization.style.display = 'block';
            tripsListContainer.style.display = 'block';
            refreshUI();
        } else {
            firstEntryDate.value = '';
            tripFormContainer.style.display = 'none';
            absenceSummary.style.display = 'none';
            timelineVisualization.style.display = 'none';
            tripsListContainer.style.display = 'none';
        }
    });

    // Save profile button
    saveProfileBtn.addEventListener('click', async () => {
        if (!currentProfile) return;
        
        const entryDate = firstEntryDate.value;
        if (!entryDate) {
            alert('Please enter the first entry date in UK.');
            return;
        }
        
        currentProfile.firstEntry = entryDate;
        await saveProfileToFile(profileSelect.value, currentProfile);
        
        tripFormContainer.style.display = 'block';
        absenceSummary.style.display = 'block';
        timelineVisualization.style.display = 'block';
        tripsListContainer.style.display = 'block';
        
        refreshUI();
    });

    // Delete profile button
    deleteProfileBtn.addEventListener('click', async () => {
        const selectedProfile = profileSelect.value;
        if (selectedProfile === '' || !currentProfile) return;
        
        if (confirm(`Are you sure you want to delete the profile "${selectedProfile}"?`)) {
            // Delete from profiles object
            delete profiles[selectedProfile];
            
            // Delete the file
            await deleteProfileFile(selectedProfile);
            
            // Update UI
            updateProfileSelect();
            profileSelect.value = '';
            profileSelect.dispatchEvent(new Event('change'));
        }
    });

    // Add trip button
    addTripBtn.addEventListener('click', async () => {
        if (!currentProfile) return;
        
        const depDate = departureDate.value;
        const retDate = returnDate.value;
        
        if (!depDate) {
            alert('Please enter a departure date.');
            return;
        }
        
        // If editing an existing trip
        if (addTripBtn.dataset.editIndex !== undefined) {
            const index = parseInt(addTripBtn.dataset.editIndex);
            
            // Update the trip
            currentProfile.trips[index] = {
                departure: depDate,
                return: retDate || null
            };
            
            // Reset the form
            delete addTripBtn.dataset.editIndex;
            addTripBtn.textContent = 'Add Trip';
        } else {
            // Add new trip
            currentProfile.trips.push({
                departure: depDate,
                return: retDate || null
            });
        }
        
        await saveProfileToFile(profileSelect.value, currentProfile);
        
        // Clear the form
        departureDate.value = '';
        returnDate.value = '';
        
        refreshUI();
    });

    // Current date input change
    currentDateInput.addEventListener('change', refreshUI);

    // Add export/import functionality
    refreshProfilesBtn.addEventListener('click', function() {
        // Create a JSON file with all profiles
        const profilesJson = JSON.stringify(profiles, null, 2);
        const blob = new Blob([profilesJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.style.display = 'none';
        downloadLink.href = url;
        downloadLink.download = 'ilr_profiles.json';
        document.body.appendChild(downloadLink);
        
        // Trigger download
        downloadLink.click();
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(downloadLink);
        }, 100);
    });
    
    // Create a file input for importing
    const importFileInput = document.createElement('input');
    importFileInput.type = 'file';
    importFileInput.accept = '.json';
    importFileInput.style.display = 'none';
    document.body.appendChild(importFileInput);
    
    // Handle file import
    importFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedProfiles = JSON.parse(e.target.result);
                
                // Merge with existing profiles
                profiles = {...profiles, ...importedProfiles};
                
                // Save to localStorage
                saveProfiles();
                
                // Update UI
                updateProfileSelect();
                
                alert('Profiles imported successfully!');
            } catch (err) {
                console.error('Error importing profiles:', err);
                alert('Error importing profiles. Please check the file format.');
            }
        };
        reader.readAsText(file);
    });
    
    // Update button text
    refreshProfilesBtn.textContent = "Export Profiles";
    
    // Create Import Profiles button
    const importProfilesBtn = document.createElement('button');
    importProfilesBtn.id = 'import-profiles-btn';
    importProfilesBtn.className = 'ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500';
    importProfilesBtn.textContent = 'Import Profiles';
    importProfilesBtn.addEventListener('click', function() {
        importFileInput.click();
    });
    
    // Add import button next to refresh button
    refreshProfilesBtn.parentNode.appendChild(importProfilesBtn);
    
    // Initialize the application
    loadProfiles();
});

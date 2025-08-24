// RunWithKam Web Admin Panel
// Handles run scheduling, editing, and real-time updates
// 
// TIMEZONE HANDLING:
// All dates are handled in Eastern Standard Time (EST, UTC-5) for consistency
// When you enter "September 24th 2025", it will always be treated as that exact date in EST
// This ensures consistent behavior regardless of the user's local timezone

// Global state
let currentDate = new Date();
let selectedDate = new Date();
let runs = [];
let editingRunId = null;

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const currentMonthElement = document.getElementById('currentMonth');
const calendarDaysElement = document.getElementById('calendarDays');
const selectedDateElement = document.getElementById('selectedDate');
const runsListElement = document.getElementById('runsList');
const runModal = document.getElementById('runModal');
const runForm = document.getElementById('runForm');
const modalTitle = document.getElementById('modalTitle');
const deleteModal = document.getElementById('deleteModal');

// Authentication
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'runwithkam2025'
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    renderCalendar();
    renderRuns();
});

function initializeApp() {
    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showDashboard();
    }
}

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Dashboard buttons
    document.getElementById('addRunBtn').addEventListener('click', showAddRunModal);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('prevMonth').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => navigateMonth(1));
    
    // Debug button
    if (document.getElementById('debugBtn')) {
        document.getElementById('debugBtn').addEventListener('click', debugDateConversion);
    }
    
    // Add test date conversion function
    window.testDateConversion = testDateConversion;
    
    // Set today's date as placeholder for new runs
    setTodayDatePlaceholder();
    
    // Add time input formatting
    setupTimeInputFormatting();
    
    // Modal buttons
    document.getElementById('closeModal').addEventListener('click', hideRunModal);
    document.getElementById('cancelRun').addEventListener('click', hideRunModal);
    document.getElementById('closeDeleteModal').addEventListener('click', hideDeleteModal);
    document.getElementById('cancelDelete').addEventListener('click', hideDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', confirmDeleteRun);
    
    // Run form
    runForm.addEventListener('submit', handleRunSubmit);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === runModal) {
            hideRunModal();
        }
        if (event.target === deleteModal) {
            hideDeleteModal();
        }
    });
}

// Authentication functions
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
        hideLoginError();
    } else {
        showLoginError('Invalid username or password');
    }
}

function handleLogout() {
    // Stop real-time updates
    cleanupRealTimeUpdates();
    
    localStorage.removeItem("adminLoggedIn");
    showLogin();
    // Clear form
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    localStorage.removeItem('adminLoggedIn');
    showLogin();
    // Clear form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
}

function hideLoginError() {
    loginError.classList.add('hidden');
}

function showLogin() {
    loginScreen.classList.add('active');
    dashboardScreen.classList.remove('active');
}

function showDashboard() {
    loginScreen.classList.remove("active");
    dashboardScreen.classList.add("active");
    
    // Start real-time updates
    initializeRealTimeUpdates();
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
}

// Calendar functions
function navigateMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    
    // Generate calendar days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    let calendarHTML = '';
    
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const isCurrentMonth = date.getMonth() === month;
        const isSelected = isSameDate(date, selectedDate);
        const hasRuns = hasRunsOnDate(date);
        
        let dayClasses = 'calendar-day';
        if (!isCurrentMonth) dayClasses += ' other-month';
        if (isSelected) dayClasses += ' selected';
        if (hasRuns) dayClasses += ' has-runs';
        
        calendarHTML += `
            <div class="${dayClasses}" data-date="${date.toISOString()}" onclick="selectDate('${date.toISOString()}')">
                <div class="calendar-day-number">${date.getDate()}</div>
            </div>
        `;
    }
    
    calendarDaysElement.innerHTML = calendarHTML;
}

function selectDate(dateString) {
    selectedDate = new Date(dateString);
    renderCalendar();
    renderRuns();
    updateSelectedDateDisplay();
}

function updateSelectedDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    selectedDateElement.textContent = selectedDate.toLocaleDateString('en-US', options);
}

function hasRunsOnDate(date) {
    return runs.some(run => isSameDate(new Date(run.date), date));
}

function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Runs management
function renderRuns() {
    const runsOnSelectedDate = runs.filter(run => 
        isSameDate(new Date(run.date), selectedDate)
    );
    
    if (runsOnSelectedDate.length === 0) {
        runsListElement.innerHTML = '<p style="color: #6c757d; font-style: italic;">No runs scheduled for this date</p>';
        return;
    }
    
    runsListElement.innerHTML = runsOnSelectedDate.map(run => `
        <div class="run-card">
            <div class="run-card-header">
                <div>
                    <div class="run-time">${run.time}</div>
                    <div class="run-location">${run.location}</div>
                </div>
                <div class="run-actions">
                    <button class="btn btn-secondary btn-icon" onclick="editRun('${run.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteRun('${run.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="run-pace">${run.pace}</div>
            ${run.description ? `<div class="run-description">${run.description}</div>` : ''}
        </div>
    `).join('');
}

function showAddRunModal() {
    editingRunId = null;
    modalTitle.textContent = 'Add New Run';
    runForm.reset();
    
    // Set today's date for new runs
    setTodayDatePlaceholder();
    
    // Set default time (text input)
    document.getElementById('runTime').value = '08:00';
    
    runModal.classList.remove('hidden');
}

function showEditRunModal(runId) {
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    editingRunId = runId;
    modalTitle.textContent = 'Edit Run';
    
    // Populate form with run data
    const runDate = new Date(run.date);
    
    // Extract just the date part (YYYY-MM-DD) from the UTC date
    // Convert UTC to EST for display (EST is UTC-5)
    const estDate = new Date(runDate.getTime() + (5 * 60 * 60 * 1000)); // Add 5 hours to convert from UTC to EST
    const dateString = estDate.toISOString().split('T')[0];
    
    document.getElementById('runDate').value = dateString;
    document.getElementById('runTime').value = run.time;
    document.getElementById('runLocation').value = run.location;
    document.getElementById('runPace').value = run.pace;
    document.getElementById('runDescription').value = run.description || '';
    
    console.log('📅 Edit modal populated:', {
        originalDate: run.date,
        runDate: runDate.toISOString(),
        formDate: dateString,
        time: run.time
    });
    
    runModal.classList.remove('hidden');
}

function editRun(runId) {
    showEditRunModal(runId);
}

function hideRunModal() {
    runModal.classList.add('hidden');
    editingRunId = null;
}

async function handleRunSubmit(event) {
    event.preventDefault();
    
    console.log('🚀 Form submission started');
    
    const formData = new FormData(runForm);
    const dateString = formData.get('runDate');
    const timeString = formData.get('runTime');
    const location = formData.get('runLocation');
    const pace = formData.get('runPace');
    
    console.log('📝 Form data:', {
        date: dateString,
        time: timeString,
        location: location,
        pace: pace
    });
    
    // Validate required fields
    console.log('🔍 Validating required fields...');
    
    if (!dateString) {
        console.log('❌ Date is missing');
        showNotification('Please enter a date', 'error');
        return;
    }
    
    if (!timeString) {
        console.log('❌ Time is missing');
        showNotification('Please enter a time', 'error');
        return;
    }
    
    if (!pace) {
        console.log('❌ Pace is missing');
        showNotification('Please select a pace', 'error');
        return;
    }
    
    // Validate location (not empty or just whitespace)
    console.log('🔍 Validating location...');
    if (!location || !location.trim()) {
        console.log('❌ Location is missing or empty:', location);
        showNotification('Please enter a location for your run', 'error');
        return;
    }
    
    console.log('✅ All required fields are present');
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        showNotification('Please enter date in YYYY-MM-DD format (e.g., 2025-08-25)', 'error');
        return;
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(timeString)) {
        showNotification('Please enter time in HH:MM format (e.g., 06:00, 17:30)', 'error');
        return;
    }
    
    // Parse date components directly (no timezone issues)
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Validate date components
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        showNotification('Please enter valid date values (month 1-12, day 1-31)', 'error');
        return;
    }
    
    // Validate time components
    if (hours < 0 || hours > 23) {
        showNotification('Please enter valid hour (0-23)', 'error');
        return;
    }
    
    if (minutes < 0 || minutes > 59) {
        showNotification('Please enter valid minutes (0-59)', 'error');
        return;
    }
    
    // Create date in Eastern Standard Time (EST) - always UTC-5
    // This ensures consistent timezone handling regardless of user's location
    // We create the date at midnight EST, then convert to UTC
    const estDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    // EST is UTC-5, so we need to add 5 hours to get the correct UTC time
    const utcDate = new Date(estDate.getTime() + (5 * 60 * 60 * 1000));
    
    // Format data consistently
    const runData = {
        date: utcDate.toISOString(), // Always use UTC midnight
        time: timeString, // Keep original time format for display
        location: formData.get('runLocation').trim(),
        pace: formData.get('runPace'),
        description: (formData.get('runDescription') || '').trim()
    };
    
    console.log('📅 Web admin sending data:', {
        originalDate: dateString,
        originalTime: timeString,
        estDate: estDate.toISOString(),
        utcDate: utcDate.toISOString(),
        estMidnight: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00-05:00`,
        timezone: 'EST (UTC-5)',
        explanation: 'EST midnight converted to UTC (adds 5 hours)'
    });
    
    if (editingRunId) {
        // Update existing run
        const runIndex = runs.findIndex(r => r.id === editingRunId);
        if (runIndex !== -1) {
            runs[runIndex] = { ...runs[runIndex], ...runData };
        }
    } else {
        // Add new run
        const newRun = {
            id: generateId(),
            ...runData
        };
        runs.push(newRun);
    }
    
    // Save to localStorage
    saveRuns();
    
    // Send to API
    try {
        if (editingRunId) {
            // Update existing run in API
            await updateRunInAPI(editingRunId, runData);
        } else {
            // Create new run in API
            await createRunInAPI(runData);
        }
    } catch (error) {
        console.error('Failed to sync with API:', error);
        let errorMessage = 'Saved locally, but failed to sync with server';
        
        // Provide more specific error messages
        if (error.message.includes('Invalid date format')) {
            errorMessage = 'Invalid date format. Please select a valid date.';
        } else if (error.message.includes('Invalid time format')) {
            errorMessage = 'Invalid time format. Please use HH:MM format.';
        } else if (error.message.includes('Invalid pace format')) {
            errorMessage = 'Invalid pace format. Please select from the dropdown.';
        } else if (error.message.includes('Missing required field')) {
            errorMessage = 'Please fill in all required fields.';
        }
        
        showNotification(errorMessage, 'error');
    }
    
    // Update UI
    renderCalendar();
    renderRuns();
    hideRunModal();
    
    // Show success message
    showNotification('Run saved successfully!', 'success');
}

function deleteRun(runId) {
    const run = runs.find(r => r.id === runId);
    if (!run) return;
    
    // Show delete confirmation
    const runDate = new Date(run.date);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = runDate.toLocaleDateString('en-US', options);
    
    document.getElementById('deleteRunDetails').textContent = 
        `${run.time} at ${run.location} (${run.pace}) on ${dateString}`;
    
    // Store the run ID to delete
    deleteModal.dataset.runId = runId;
    deleteModal.classList.remove('hidden');
}

async function confirmDeleteRun() {
    const runId = deleteModal.dataset.runId;
    const runIndex = runs.findIndex(r => r.id === runId);
    
    if (runIndex !== -1) {
        try {
            // Delete from API
            await deleteRunInAPI(runId);
            
            // Remove from local array
            runs.splice(runIndex, 1);
            saveRuns();
            renderCalendar();
            renderRuns();
            hideDeleteModal();
            showNotification('Run deleted successfully!', 'success');
        } catch (error) {
            console.error('Failed to delete from API:', error);
            showNotification('Deleted locally, but failed to sync with server', 'warning');
        }
    }
}

function hideDeleteModal() {
    deleteModal.classList.add('hidden');
}

// Utility functions
function generateId() {
    // Generate a proper UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function saveRuns() {
    localStorage.setItem('runs', JSON.stringify(runs));
}

function loadSampleData() {
    const savedRuns = localStorage.getItem('runs');
    if (savedRuns) {
        runs = JSON.parse(savedRuns);
    } else {
        // Load sample data
        const today = new Date();
        runs = [
            {
                id: generateId(),
                date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
                time: '06:00',
                location: 'Central Park',
                pace: '8:30/mile',
                description: 'Morning run around the reservoir'
            },
            {
                id: generateId(),
                date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).toISOString(),
                time: '17:30',
                location: 'Brooklyn Bridge',
                pace: '9:00/mile',
                description: 'Sunset run across the bridge'
            },
            {
                id: generateId(),
                date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString(),
                time: '07:00',
                location: 'Prospect Park',
                pace: '7:30/mile',
                description: 'Speed workout on the loop'
            }
        ];
        saveRuns();
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Set background color based on type
    let backgroundColor;
    switch (type) {
        case 'success':
            backgroundColor = '#28a745';
            break;
        case 'error':
            backgroundColor = '#dc3545';
            break;
        case 'warning':
            backgroundColor = '#ffc107';
            break;
        default:
            backgroundColor = '#17a2b8';
    }
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Mobile-specific enhancements
function setupMobileEnhancements() {
    // Prevent zoom on input focus (iOS)
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (window.innerWidth <= 768) {
                this.style.fontSize = '16px';
            }
        });
        
        input.addEventListener('blur', function() {
            this.style.fontSize = '';
        });
    });
    
    // Add touch feedback for buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
}

// Initialize mobile enhancements
setupMobileEnhancements();

// Handle window resize
window.addEventListener('resize', function() {
    // Re-render calendar on resize for better mobile experience
    if (window.innerWidth <= 768) {
        renderCalendar();
    }
});

// Set today's date as placeholder
function setTodayDatePlaceholder() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    // Set as placeholder and default value for new runs
    const dateInput = document.getElementById('runDate');
    if (dateInput) {
        dateInput.placeholder = todayString;
        // Only set default value if it's a new run (not editing)
        if (!editingRunId) {
            dateInput.value = todayString;
        }
    }
    
    // Set default time for new runs
    const timeInput = document.getElementById('runTime');
    if (timeInput && !editingRunId) {
        timeInput.value = '08:00';
    }
}

// Setup time input formatting and validation
function setupTimeInputFormatting() {
    const timeInput = document.getElementById('runTime');
    if (timeInput) {
        // Auto-format time input (HH:MM)
        timeInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            
            if (value.length >= 2) {
                // Insert colon after first two digits
                value = value.substring(0, 2) + ':' + value.substring(2, 4);
            }
            
            // Limit to 5 characters (HH:MM)
            if (value.length > 5) {
                value = value.substring(0, 5);
            }
            
            e.target.value = value;
        });
        
        // Validate on blur
        timeInput.addEventListener('blur', function(e) {
            const value = e.target.value;
            const timeRegex = /^\d{2}:\d{2}$/;
            
            if (value && !timeRegex.test(value)) {
                e.target.classList.add('invalid');
            } else {
                e.target.classList.remove('invalid');
            }
        });
    }
}

// Debug function to test date conversion
function debugDateConversion() {
    console.log('🔍 Debugging date conversion...');
    
    // Test current form values
    const formData = new FormData(runForm);
    const dateString = formData.get('runDate');
    const timeString = formData.get('runTime');
    
    if (dateString && timeString) {
        console.log('📅 Form values:', { dateString, timeString });
        
        // Test the same conversion logic used in form submission
        const localDateTime = new Date(`${dateString}T${timeString}:00`);
        const utcDate = new Date(Date.UTC(
            localDateTime.getFullYear(),
            localDateTime.getMonth(),
            localDateTime.getDate(),
            0, 0, 0, 0
        ));
        
        console.log('🔄 Date conversion test:', {
            originalDate: dateString,
            originalTime: timeString,
            localDateTime: localDateTime.toISOString(),
            utcDate: utcDate.toISOString(),
            timezoneOffset: localDateTime.getTimezoneOffset(),
            isLocalDateValid: !isNaN(localDateTime.getTime()),
            isUtcDateValid: !isNaN(utcDate.getTime())
        });
    } else {
        console.log('⚠️ No form data to test');
    }
    
    // Test API response parsing
    console.log('🌐 Testing API response...');
    fetch('http://localhost:3000/api/runs')
        .then(response => response.json())
        .then(data => {
            console.log('📊 API Response:', data);
            if (data.data && data.data.length > 0) {
                const firstRun = data.data[0];
                console.log('📅 First run date analysis:', {
                    originalDate: firstRun.date,
                    parsedDate: new Date(firstRun.date),
                    isValid: !isNaN(new Date(firstRun.date).getTime()),
                    isoString: new Date(firstRun.date).toISOString()
                });
            }
        })
        .catch(error => {
            console.error('❌ API test failed:', error);
        });
}

// Export functions for potential API integration
window.RunWithKamAdmin = {
    getRuns: () => runs,
    addRun: (runData) => {
        const newRun = { id: generateId(), ...runData };
        runs.push(newRun);
        saveRuns();
        renderCalendar();
        renderRuns();
        return newRun;
    },
    updateRun: (runId, runData) => {
        const runIndex = runs.findIndex(r => r.id === runId);
        if (runIndex !== -1) {
            runs[runIndex] = { ...runs[runIndex], ...runData };
            saveRuns();
            renderCalendar();
            renderRuns();
            return runs[runIndex];
        }
        return null;
    },
    deleteRun: (runId) => {
        const runIndex = runs.findIndex(r => r.id === runId);
        if (runIndex !== -1) {
            const deletedRun = runs.splice(runIndex, 1)[0];
            saveRuns();
            renderCalendar();
            renderRuns();
            return deletedRun;
        }
        return null;
    }
};

// ===== REAL-TIME UPDATE SYSTEM =====
let updateInterval = null;
let lastUpdateTime = null;

// Start real-time updates
function startRealTimeUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Check for updates every 10 seconds
    updateInterval = setInterval(async () => {
        await checkForUpdates();
    }, 10000);
    
    console.log('🔄 Real-time updates started - checking every 10 seconds');
}

// Stop real-time updates
function stopRealTimeUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    console.log('⏹️ Real-time updates stopped');
}

// Check for updates from API
async function checkForUpdates() {
    try {
        // Try to fetch from API first
        const response = await fetch('http://localhost:3000/api/runs', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const apiResponse = await response.json();
            // Handle wrapped API response format
            const apiRuns = apiResponse.data || apiResponse;
            await syncWithAPI(apiRuns);
        } else {
            // Fallback to localStorage sync
            await syncWithLocalStorage();
        }
    } catch (error) {
        // If API is not available, sync with localStorage
        await syncWithLocalStorage();
    }
}

// Sync data with API
async function syncWithAPI(apiRuns) {
    const currentRunsString = JSON.stringify(runs);
    const apiRunsString = JSON.stringify(apiRuns);
    
    if (currentRunsString !== apiRunsString) {
        console.log('🔄 New data detected from API - updating...');
        runs = apiRuns;
        renderCalendar();
        renderRuns();
        lastUpdateTime = new Date();
        
        // Show update notification
        showUpdateNotification('Data updated from server');
    }
}

// Sync data with localStorage (fallback)
async function syncWithLocalStorage() {
    const storedRuns = localStorage.getItem('runs');
    if (storedRuns) {
        const parsedRuns = JSON.parse(storedRuns);
        const currentRunsString = JSON.stringify(runs);
        const storedRunsString = JSON.stringify(parsedRuns);
        
        if (currentRunsString !== storedRunsString) {
            console.log('🔄 New data detected from localStorage - updating...');
            runs = parsedRuns;
            renderCalendar();
            renderRuns();
            lastUpdateTime = new Date();
            
            // Show update notification
            showUpdateNotification('Data updated from storage');
        }
    }
}

// Show update notification
function showUpdateNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <span>${message}</span>
        <small>${new Date().toLocaleTimeString()}</small>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Manual refresh function
function manualRefresh() {
    checkForUpdates();
    showUpdateNotification('Manual refresh completed');
}

// Add refresh button to dashboard
function addRefreshButton() {
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader && !document.getElementById('refreshBtn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refreshBtn';
        refreshBtn.className = 'btn btn-secondary';
        refreshBtn.innerHTML = '🔄 Refresh';
        refreshBtn.onclick = manualRefresh;
        
        // Insert after logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.parentNode.insertBefore(refreshBtn, logoutBtn.nextSibling);
        }
    }
}

// Initialize real-time updates when dashboard loads
function initializeRealTimeUpdates() {
    startRealTimeUpdates();
    addRefreshButton();
    
    // Show status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'statusIndicator';
    statusIndicator.className = 'status-indicator';
    statusIndicator.innerHTML = '🟢 Live Updates Active';
    document.body.appendChild(statusIndicator);
}

// Cleanup on logout
function cleanupRealTimeUpdates() {
    stopRealTimeUpdates();
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) {
        statusIndicator.remove();
    }
}

// API Integration Functions
async function createRunInAPI(runData) {
    const response = await fetch('http://localhost:3000/api/runs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(runData)
    });
    
    if (!response.ok) {
        throw new Error(`Failed to create run: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
}

async function updateRunInAPI(runId, runData) {
    const response = await fetch(`http://localhost:3000/api/runs/${runId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(runData)
    });
    
    if (!response.ok) {
        throw new Error(`Failed to update run: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
}

async function deleteRunInAPI(runId) {
    const response = await fetch(`http://localhost:3000/api/runs/${runId}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        throw new Error(`Failed to delete run: ${response.statusText}`);
    }
    
    return true;
}

// Test date conversion function for debugging
function testDateConversion() {
    const testDate = '2025-09-24';
    const [year, month, day] = testDate.split('-').map(Number);
    
    console.log('🧪 Testing date conversion for:', testDate);
    
    // Method 1: Current approach
    const estDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const utcDate = new Date(estDate.getTime() + (5 * 60 * 60 * 1000));
    
    console.log('📅 Method 1 (Current):', {
        input: testDate,
        estDate: estDate.toISOString(),
        utcDate: utcDate.toISOString(),
        estDisplay: estDate.toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
        utcDisplay: utcDate.toLocaleDateString('en-US', { timeZone: 'UTC' })
    });
    
    // Method 2: Alternative approach using Date.UTC
    const utcDate2 = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0)); // 5 AM UTC = midnight EST
    
    console.log('📅 Method 2 (Alternative):', {
        input: testDate,
        utcDate: utcDate2.toISOString(),
        estDisplay: utcDate2.toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
        utcDisplay: utcDate2.toLocaleDateString('en-US', { timeZone: 'UTC' })
    });
    
    // Method 3: Direct EST creation
    const estDate3 = new Date(`${testDate}T00:00:00-05:00`);
    
    console.log('📅 Method 3 (Direct EST):', {
        input: testDate,
        estDate: estDate3.toISOString(),
        estDisplay: estDate3.toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
        utcDisplay: estDate3.toLocaleDateString('en-US', { timeZone: 'UTC' })
    });
}


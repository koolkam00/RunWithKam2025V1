// Global variables
let currentRuns = [];
let currentLeaderboard = [];

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin panel DOM loaded - initializing...');
    initializeAdminPanel();
});

// Main initialization function
function initializeAdminPanel() {
    try {
        console.log('🔧 Setting up admin panel...');
        
        // Setup event listeners
        setupEventListeners();
        
        // Load initial data
        loadBasicData();
        
        console.log('✅ Admin panel initialization complete!');
    } catch (error) {
        console.error('❌ Error initializing admin panel:', error);
    }
}

// Setup all button event listeners
function setupEventListeners() {
    console.log('🔗 Setting up event listeners...');
    
    try {
        // Add Run Button
        const addRunBtn = document.getElementById('addRunBtn');
        if (addRunBtn) {
            addRunBtn.onclick = showAddRunModal;
            console.log('✅ Add Run button listener added');
        } else {
            console.warn('⚠️ Add Run button not found');
        }
        
        // Refresh Button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.onclick = refreshData;
            console.log('✅ Refresh button listener added');
        } else {
            console.warn('⚠️ Refresh button not found');
        }
        
        // Debug Button
        const debugBtn = document.getElementById('debugBtn');
        if (debugBtn) {
            debugBtn.onclick = debugDateConversion;
            console.log('✅ Debug button listener added');
        } else {
            console.warn('⚠️ Debug button not found');
        }
        
        // Logout Button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = handleLogout;
            console.log('✅ Logout button listener added');
        } else {
            console.warn('⚠️ Logout button not found');
        }
        
        // Calendar Navigation
        const prevMonthBtn = document.getElementById('prevMonth');
        if (prevMonthBtn) {
            prevMonthBtn.onclick = () => navigateMonth(-1);
            console.log('✅ Previous Month button listener added');
        } else {
            console.warn('⚠️ Previous Month button not found');
        }
        
        const nextMonthBtn = document.getElementById('nextMonth');
        if (nextMonthBtn) {
            nextMonthBtn.onclick = () => navigateMonth(1);
            console.log('✅ Next Month button listener added');
        } else {
            console.warn('⚠️ Next Month button not found');
        }
        
        // Add User Button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.onclick = showAddUserModal;
            console.log('✅ Add User button listener added');
        } else {
            console.warn('⚠️ Add User button not found');
        }
        
        // Refresh Leaderboard Button
        const refreshLeaderboardBtn = document.getElementById('refreshLeaderboardBtn');
        if (refreshLeaderboardBtn) {
            refreshLeaderboardBtn.onclick = refreshData;
            console.log('✅ Refresh Leaderboard button listener added');
        } else {
            console.warn('⚠️ Refresh Leaderboard button not found');
        }
        
        // Modal Close Buttons
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) {
            closeModalBtn.onclick = hideRunModal;
            console.log('✅ Close Run Modal button listener added');
        } else {
            console.warn('⚠️ Close Run Modal button not found');
        }
        
        const closeLeaderboardModalBtn = document.getElementById('closeLeaderboardModal');
        if (closeLeaderboardModalBtn) {
            closeLeaderboardModalBtn.onclick = hideLeaderboardModal;
            console.log('✅ Close Leaderboard Modal button listener added');
        } else {
            console.warn('⚠️ Close Leaderboard Modal button not found');
        }
        
        // Cancel Buttons
        const cancelRunBtn = document.getElementById('cancelRun');
        if (cancelRunBtn) {
            cancelRunBtn.onclick = hideRunModal;
            console.log('✅ Cancel Run button listener added');
        } else {
            console.warn('⚠️ Cancel Run button not found');
        }
        
        const cancelLeaderboardBtn = document.getElementById('cancelLeaderboard');
        if (cancelLeaderboardBtn) {
            cancelLeaderboardBtn.onclick = hideLeaderboardModal;
            console.log('✅ Cancel Leaderboard button listener added');
        } else {
            console.warn('⚠️ Cancel Leaderboard button not found');
        }
        
        // Form submissions
        const runForm = document.getElementById('runForm');
        if (runForm) {
            runForm.onsubmit = handleRunSubmit;
            console.log('✅ Run form submission listener added');
        } else {
            console.warn('⚠️ Run form not found');
        }
        
        const leaderboardForm = document.getElementById('leaderboardForm');
        if (leaderboardForm) {
            leaderboardForm.onsubmit = handleLeaderboardSubmit;
            console.log('✅ Leaderboard form submission listener added');
        } else {
            console.warn('⚠️ Leaderboard form not found');
        }
        
        console.log('🎯 All event listeners setup complete!');
    } catch (error) {
        console.error('❌ Error setting up event listeners:', error);
    }
}

// Load basic data
function loadBasicData() {
    console.log('📊 Loading basic data...');
    
    // Load runs
    fetch('http://localhost:3000/api/runs')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Runs loaded:', data);
            if (data.success) {
                currentRuns = data.data;
                displayRuns(data.data);
            }
        })
        .catch(error => {
            console.error('❌ Error loading runs:', error);
        });
    
    // Load leaderboard
    fetch('http://localhost:3000/api/leaderboard')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Leaderboard loaded:', data);
            if (data.success) {
                currentLeaderboard = data.data;
                displayLeaderboard(data.data);
            }
        })
        .catch(error => {
            console.error('❌ Error loading leaderboard:', error);
        });
}

// Display runs
function displayRuns(runs) {
    const runsList = document.getElementById('runsList');
    if (runsList && runs.length > 0) {
        runsList.innerHTML = runs.map(run => `
            <div style="border: 1px solid #ccc; padding: 10px; margin: 5px; border-radius: 5px;">
                <strong>${run.location}</strong> - ${run.time}<br>
                Date: ${new Date(run.date).toLocaleDateString()}<br>
                Pace: ${run.pace}
            </div>
        `).join('');
    } else if (runsList) {
        runsList.innerHTML = '<p>No runs scheduled yet.</p>';
    }
}

// Display leaderboard
function displayLeaderboard(users) {
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    if (leaderboardContainer && users.length > 0) {
        leaderboardContainer.innerHTML = users.map(user => `
            <div style="border: 1px solid #ccc; padding: 10px; margin: 5px; border-radius: 5px;">
                <strong>${user.firstName} ${user.lastName}</strong><br>
                Runs: ${user.totalRuns} | Miles: ${user.totalMiles}
            </div>
        `).join('');
    } else if (leaderboardContainer) {
        leaderboardContainer.innerHTML = '<p>No users in leaderboard yet.</p>';
    }
}

// Add Run Modal Functions
function showAddRunModal() {
    console.log('➕ Opening Add Run Modal');
    try {
        const modal = document.getElementById('runModal');
        const modalTitle = document.getElementById('modalTitle');
        const runDate = document.getElementById('runDate');
        const runTime = document.getElementById('runTime');
        
        if (modal && modalTitle && runDate && runTime) {
            modal.classList.remove('hidden');
            modalTitle.textContent = 'Add New Run';
            
            // Set today's date as default
            const today = new Date().toISOString().split('T')[0];
            runDate.value = today;
            runTime.value = '08:00';
            
            console.log('✅ Add Run modal opened successfully');
        } else {
            console.error('❌ Required modal elements not found');
        }
    } catch (error) {
        console.error('❌ Error opening Add Run modal:', error);
    }
}

function hideRunModal() {
    console.log('❌ Closing Run Modal');
    try {
        const modal = document.getElementById('runModal');
        const form = document.getElementById('runForm');
        
        if (modal) {
            modal.classList.add('hidden');
        }
        if (form) {
            form.reset();
        }
        
        console.log('✅ Run modal closed successfully');
    } catch (error) {
        console.error('❌ Error closing Run modal:', error);
    }
}

// Handle Run Form Submit
function handleRunSubmit(event) {
    event.preventDefault();
    console.log('💾 Submitting run form...');
    
    try {
        const formData = new FormData(event.target);
        const runData = {
            date: formData.get('runDate'),
            time: formData.get('runTime'),
            location: formData.get('runLocation'),
            pace: formData.get('runPace'),
            description: formData.get('runDescription')
        };
        
        console.log('📝 Run data:', runData);
        
        // Send to API
        fetch('http://localhost:3000/api/runs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(runData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Run added successfully!');
                hideRunModal();
                loadBasicData(); // Reload data
                alert('Run added successfully!');
            } else {
                console.error('❌ Failed to add run:', data.message);
                alert('Failed to add run: ' + data.message);
            }
        })
        .catch(error => {
            console.error('❌ Error adding run:', error);
            alert('Error adding run: ' + error.message);
        });
    } catch (error) {
        console.error('❌ Error in handleRunSubmit:', error);
        alert('Error submitting form: ' + error.message);
    }
}

// Calendar Navigation
function navigateMonth(direction) {
    console.log('📅 Navigating month:', direction);
    try {
        const currentMonthElement = document.getElementById('currentMonth');
        if (currentMonthElement) {
            const currentText = currentMonthElement.textContent;
            const [month, year] = currentText.split(' ');
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            let monthIndex = monthNames.indexOf(month);
            let yearNum = parseInt(year);
            
            monthIndex += direction;
            if (monthIndex < 0) {
                monthIndex = 11;
                yearNum--;
            } else if (monthIndex > 11) {
                monthIndex = 0;
                yearNum++;
            }
            
            currentMonthElement.textContent = `${monthNames[monthIndex]} ${yearNum}`;
            console.log('✅ Month updated to:', currentMonthElement.textContent);
        } else {
            console.warn('⚠️ Current month element not found');
        }
    } catch (error) {
        console.error('❌ Error navigating month:', error);
    }
}

// Refresh Functions
function refreshData() {
    console.log('🔄 Refreshing all data...');
    try {
        loadBasicData();
        alert('Data refreshed!');
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        alert('Error refreshing data: ' + error.message);
    }
}

// Logout Function (just reloads the page)
function handleLogout() {
    console.log('🚪 Logging out...');
    try {
        if (confirm('Are you sure you want to logout?')) {
            location.reload();
        }
    } catch (error) {
        console.error('❌ Error in logout:', error);
    }
}

// Leaderboard Functions
function showAddUserModal() {
    console.log('👤 Opening Add User Modal');
    try {
        const modal = document.getElementById('leaderboardModal');
        const modalTitle = document.getElementById('leaderboardModalTitle');
        const form = document.getElementById('leaderboardForm');
        
        if (modal && modalTitle && form) {
            modal.classList.remove('hidden');
            modalTitle.textContent = 'Add New User';
            form.reset();
            
            console.log('✅ Add User modal opened successfully');
        } else {
            console.error('❌ Required leaderboard modal elements not found');
        }
    } catch (error) {
        console.error('❌ Error opening Add User modal:', error);
    }
}

function hideLeaderboardModal() {
    console.log('❌ Closing Leaderboard Modal');
    try {
        const modal = document.getElementById('leaderboardModal');
        const form = document.getElementById('leaderboardForm');
        
        if (modal) {
            modal.classList.add('hidden');
        }
        if (form) {
            form.reset();
        }
        
        console.log('✅ Leaderboard modal closed successfully');
    } catch (error) {
        console.error('❌ Error closing Leaderboard modal:', error);
    }
}

// Handle Leaderboard Form Submit
function handleLeaderboardSubmit(event) {
    event.preventDefault();
    console.log('💾 Submitting leaderboard form...');
    
    try {
        const formData = new FormData(event.target);
        const userData = {
            firstName: formData.get('userFirstName'),
            lastName: formData.get('userLastName'),
            totalRuns: parseInt(formData.get('userTotalRuns')),
            totalMiles: parseFloat(formData.get('userTotalMiles'))
        };
        
        console.log('👤 User data:', userData);
        
        // Send to API
        fetch('http://localhost:3000/api/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ User added successfully!');
                hideLeaderboardModal();
                loadBasicData(); // Reload data
                alert('User added successfully!');
            } else {
                console.error('❌ Failed to add user:', data.message);
                alert('Failed to add user: ' + data.message);
            }
        })
        .catch(error => {
            console.error('❌ Error adding user:', error);
            alert('Error adding user: ' + error.message);
        });
    } catch (error) {
        console.error('❌ Error in handleLeaderboardSubmit:', error);
        alert('Error submitting form: ' + error.message);
    }
}

// Debug Function
function debugDateConversion() {
    console.log('🐛 Debug: Testing date conversion...');
    try {
        const testDate = '2025-09-24';
        const [year, month, day] = testDate.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
        
        console.log('🧪 Test for 2025-09-24:');
        console.log('Input:', testDate);
        console.log('UTC Date:', utcDate.toISOString());
        console.log('EST Display:', utcDate.toLocaleDateString('en-US', { timeZone: 'America/New_York' }));
        console.log('Date object:', utcDate);
        
        alert('Check console for date conversion debug info!');
    } catch (error) {
        console.error('❌ Error in debug function:', error);
        alert('Error in debug function: ' + error.message);
    }
}

// Test function for debugging
window.testAdminPanel = function() {
    console.log('🧪 Testing admin panel functions...');
    console.log('Current runs:', currentRuns);
    console.log('Current leaderboard:', currentLeaderboard);
    alert('Check console for admin panel test info!');
};

console.log('✅ All functions loaded and ready!');

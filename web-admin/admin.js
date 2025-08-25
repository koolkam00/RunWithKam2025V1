// Global variables
const API_BASE = (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');
let currentRuns = [];
let currentLeaderboard = [];
let lastSyncTime = null;
let syncStatus = 'idle';

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin panel DOM loaded - initializing...');
    console.log('🔍 Checking for required DOM elements...');
    
    // Verify all required elements exist
    const requiredElements = [
        'addRunBtn', 'refreshBtn', 'debugBtn', 'logoutBtn',
        'prevMonth', 'nextMonth', 'addUserBtn', 'refreshLeaderboardBtn',
        'runModal', 'leaderboardModal', 'runsList', 'leaderboardContainer'
    ];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ Found element: ${id}`);
        } else {
            console.warn(`⚠️ Missing element: ${id}`);
        }
    });
    
    setupLogin();
    // Fallback click delegation for login button in case direct handler fails
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!t) return;
        const id = (t.id || (t.closest && t.closest('#loginButton') && 'loginButton'));
        if (id === 'loginButton') {
            e.preventDefault();
            handleLoginClick();
        }
    });
});
function showScreen(idToShow) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const el = document.getElementById(idToShow);
    if (el) {
        el.classList.add('active');
        el.style.display = 'block';
    }
}

function setupLogin() {
    const loginBtn = document.getElementById('loginButton');
    if (loginBtn) {
        loginBtn.onclick = handleLoginClick;
        console.log('✅ Login button wired');
    }
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => { e.preventDefault(); handleLoginClick(); });
    }
    // Also support pressing Enter in either field
    const u = document.getElementById('username');
    const p = document.getElementById('password');
    [u, p].forEach(el => {
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLoginClick();
                }
            });
        }
    });
    // Allow quick access with URL flag ?autologin=1
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autologin') === '1') {
            localStorage.setItem('adminLoggedIn', 'true');
        }
    } catch (_) {}
    const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (isLoggedIn) {
        showScreen('dashboardScreen');
        initializeAdminPanel();
    } else {
        showScreen('loginScreen');
    }
}

function handleLoginClick() {
    try {
        console.log('🔐 Login button clicked');
        const btn = document.getElementById('loginButton');
        if (btn) btn.disabled = true;
        const username = ((document.getElementById('username') || {}).value || '').trim();
        const password = ((document.getElementById('password') || {}).value || '').trim();
        const errorEl = document.getElementById('loginError');
        console.log('🔎 Credentials entered:', { hasUser: !!username, hasPass: !!password });
        // Simple local auth; can be replaced with API later
        if (username === 'admin' && password === 'runwithkam2025') {
            localStorage.setItem('adminLoggedIn', 'true');
            if (errorEl) errorEl.classList.add('hidden');
            showScreen('dashboardScreen');
            initializeAdminPanel();
        } else {
            if (errorEl) errorEl.classList.remove('hidden');
        }
    } catch (e) {
        console.error('❌ Login error:', e);
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = 'An unexpected error occurred. Please try again.';
            errorEl.classList.remove('hidden');
        }
    } finally {
        const btn = document.getElementById('loginButton');
        if (btn) btn.disabled = false;
    }
}

// Expose to global as a final fallback
window.handleLoginClick = handleLoginClick;


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
    syncStatus = 'loading';
    
    // Load runs
    fetch(`${API_BASE}/runs`)
        .then(response => {
            console.log('📡 Runs API response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ Runs loaded:', data);
            if (data.success) {
                currentRuns = data.data;
                displayRuns(data.data);
                console.log(`📊 Displayed ${data.data.length} runs`);
                updateSyncStatus('success', 'runs');
            } else {
                console.error('❌ Runs API returned success: false');
                updateSyncStatus('error', 'runs');
            }
        })
        .catch(error => {
            console.error('❌ Error loading runs:', error);
            updateSyncStatus('error', 'runs');
        });
    
    // Load leaderboard (include all users so admin can manage unregistered too)
    fetch(`${API_BASE}/leaderboard?includeAll=1`)
        .then(response => {
            console.log('📡 Leaderboard API response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ Leaderboard loaded:', data);
            if (data.success) {
                currentLeaderboard = data.data;
                displayLeaderboard(data.data);
                console.log(`📊 Displayed ${data.data.length} leaderboard users`);
                updateSyncStatus('success', 'leaderboard');
            } else {
                console.error('❌ Leaderboard API returned success: false');
                updateSyncStatus('error', 'leaderboard');
            }
        })
        .catch(error => {
            console.error('❌ Error loading leaderboard:', error);
            updateSyncStatus('error', 'leaderboard');
        });
}

// Update sync status
function updateSyncStatus(status, dataType) {
    syncStatus = status;
    lastSyncTime = new Date();
    
    const statusIndicator = document.getElementById('syncStatus');
    if (statusIndicator) {
        const statusText = status === 'success' ? '✅ Synced' : 
                          status === 'loading' ? '🔄 Syncing...' : '❌ Sync Failed';
        const timeText = lastSyncTime ? ` (${lastSyncTime.toLocaleTimeString()})` : '';
        statusIndicator.textContent = `${statusText}${timeText}`;
        statusIndicator.className = `sync-status ${status}`;
    }
    
    console.log(`🔄 Sync status updated: ${status} for ${dataType}`);
}

// Display runs
function displayRuns(runs) {
    console.log('🎨 Displaying runs:', runs);
    const runsList = document.getElementById('runsList');
    if (runsList && runs.length > 0) {
        runsList.innerHTML = runs.map(run => `
            <div class="run-card">
                <div class="run-card-header">
                    <div class="run-time">${run.time}</div>
                    <div class="run-actions">
                        <button class="btn btn-secondary btn-sm" data-action="edit-run" data-id="${run.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-danger btn-sm" data-action="delete-run" data-id="${run.id}"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                <div class="run-location">${run.location}</div>
                <div>📅 ${new Date(run.date).toLocaleDateString('en-US')} at ${run.time}</div>
                <div class="run-pace">${run.pace}</div>
                ${run.description ? `<div class="run-description">${run.description}</div>` : ''}
            </div>
        `).join('');
        // Hook up action buttons
        runsList.querySelectorAll('[data-action="edit-run"]').forEach(btn => btn.addEventListener('click', () => openEditRun(btn.getAttribute('data-id'))));
        runsList.querySelectorAll('[data-action="delete-run"]').forEach(btn => btn.addEventListener('click', () => openDeleteRun(btn.getAttribute('data-id'))));
        console.log(`✅ Displayed ${runs.length} runs in the UI`);
    } else if (runsList) {
        runsList.innerHTML = '<p>No runs scheduled yet.</p>';
        console.log('ℹ️ No runs to display');
    } else {
        console.warn('⚠️ Runs list element not found');
    }
}

// Display leaderboard
function displayLeaderboard(users) {
    console.log('🎨 Displaying leaderboard:', users);
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    if (leaderboardContainer && users.length > 0) {
        leaderboardContainer.innerHTML = users.map(user => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank">
                    <div class="rank-number ${user.rank === 1 ? 'rank-1' : user.rank === 2 ? 'rank-2' : user.rank === 3 ? 'rank-3' : 'rank-other'}">${user.rank}</div>
                    <div class="user-info">
                        <div class="user-name">${user.firstName} ${user.lastName}</div>
                        <div class="user-stats">
                            <span><i class="fas fa-running"></i> ${user.totalRuns} runs</span>
                            <span><i class="fas fa-route"></i> ${user.totalMiles} miles</span>
                        </div>
                        <div class="user-increment" style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                            <button class="btn btn-secondary btn-sm" data-action="inc-run" data-id="${user.id}">+ Run</button>
                            <button class="btn btn-secondary btn-sm" data-action="inc-mile" data-id="${user.id}">+ 1 Mile</button>
                            <input type="number" min="0.1" step="0.1" placeholder="Miles" data-miles-input="${user.id}" style="width:90px; padding:6px; border:1px solid #ddd; border-radius:6px;">
                            <button class="btn btn-secondary btn-sm" data-action="inc-mile-custom" data-id="${user.id}">+ Miles</button>
                        </div>
                    </div>
                </div>
                <div class="leaderboard-actions">
                    <button class="btn-edit" data-action="edit-user" data-id="${user.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-delete" data-action="delete-user" data-id="${user.id}"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `).join('');
        // Hook up action buttons
        leaderboardContainer.querySelectorAll('[data-action="edit-user"]').forEach(btn => btn.addEventListener('click', () => openEditUser(btn.getAttribute('data-id'))));
        leaderboardContainer.querySelectorAll('[data-action="delete-user"]').forEach(btn => btn.addEventListener('click', () => deleteUser(btn.getAttribute('data-id'))));
        // Increment actions
        leaderboardContainer.querySelectorAll('[data-action="inc-run"]').forEach(btn => btn.addEventListener('click', () => incrementUserRuns(btn.getAttribute('data-id'), 1)));
        leaderboardContainer.querySelectorAll('[data-action="inc-mile"]').forEach(btn => btn.addEventListener('click', () => incrementUserMiles(btn.getAttribute('data-id'), 1)));
        leaderboardContainer.querySelectorAll('[data-action="inc-mile-custom"]').forEach(btn => btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            const input = leaderboardContainer.querySelector(`[data-miles-input="${userId}"]`);
            const val = parseFloat((input && input.value) || '0');
            if (!isNaN(val) && val > 0) {
                incrementUserMiles(userId, val);
                input.value = '';
            } else {
                alert('Enter a valid miles amount (> 0).');
            }
        }));
        console.log(`✅ Displayed ${users.length} leaderboard users in the UI`);
    } else if (leaderboardContainer) {
        leaderboardContainer.innerHTML = '<p>No users in leaderboard yet.</p>';
        console.log('ℹ️ No leaderboard users to display');
    } else {
        console.warn('⚠️ Leaderboard container element not found');
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

function openEditRun(runId) {
    const run = currentRuns.find(r => r.id === runId);
    if (!run) return;
    const modal = document.getElementById('runModal');
    const modalTitle = document.getElementById('modalTitle');
    const runDate = document.getElementById('runDate');
    const runTime = document.getElementById('runTime');
    const runLocation = document.getElementById('runLocation');
    const runPace = document.getElementById('runPace');
    const runDescription = document.getElementById('runDescription');
    modal.classList.remove('hidden');
    modalTitle.textContent = 'Edit Run';
    // Pre-fill
    runDate.value = new Date(run.date).toISOString().slice(0,10);
    runTime.value = run.time;
    runLocation.value = run.location;
    runPace.value = run.pace;
    runDescription.value = run.description || '';
    // Attach runId to form for update
    document.getElementById('runForm').setAttribute('data-run-id', runId);
}

function openDeleteRun(runId) {
    const run = currentRuns.find(r => r.id === runId);
    if (!run) return;
    const modal = document.getElementById('deleteModal');
    const details = document.getElementById('deleteRunDetails');
    details.textContent = `${new Date(run.date).toLocaleDateString('en-US')} ${run.time} - ${run.location}`;
    modal.classList.remove('hidden');
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn = document.getElementById('cancelDelete');
    const closeBtn = document.getElementById('closeDeleteModal');
    const cleanup = () => {
        modal.classList.add('hidden');
        confirmBtn.onclick = null; cancelBtn.onclick = null; closeBtn.onclick = null;
    };
    confirmBtn.onclick = () => {
        fetch(`${API_BASE}/runs/${runId}`, { method: 'DELETE' })
          .then(r => { if (!r.ok) throw new Error('Delete failed'); return r.json(); })
          .then(() => { cleanup(); loadBasicData(); })
          .catch(err => { console.error(err); alert('Failed to delete run'); });
    };
    cancelBtn.onclick = cleanup; closeBtn.onclick = cleanup;
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
        
        console.log('📝 Run data to submit:', runData);
        const runId = event.target.getAttribute('data-run-id');
        const isUpdate = !!runId;
        const url = isUpdate ? `${API_BASE}/runs/${runId}` : `${API_BASE}/runs`;
        const method = isUpdate ? 'PUT' : 'POST';
        // Send to API
        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(runData)
        })
        .then(response => {
            console.log('📡 Create run API response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('✅ Run added successfully!');
                hideRunModal();
                event.target.removeAttribute('data-run-id');
                loadBasicData(); // Reload data
                alert(isUpdate ? 'Run updated successfully!' : 'Run added successfully!');
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
            localStorage.removeItem('adminLoggedIn');
            showScreen('loginScreen');
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

function openEditUser(userId) {
    const user = currentLeaderboard.find(u => u.id === userId);
    if (!user) return;
    const modal = document.getElementById('leaderboardModal');
    document.getElementById('leaderboardModalTitle').textContent = 'Edit User';
    document.getElementById('userFirstName').value = user.firstName;
    document.getElementById('userLastName').value = user.lastName;
    document.getElementById('userTotalRuns').value = user.totalRuns;
    document.getElementById('userTotalMiles').value = user.totalMiles;
    document.getElementById('leaderboardForm').setAttribute('data-user-id', userId);
    modal.classList.remove('hidden');
}

function deleteUser(userId) {
    if (!confirm('Delete this user?')) return;
    fetch(`${API_BASE}/leaderboard/${userId}`, { method: 'DELETE' })
      .then(r => { if (!r.ok) throw new Error('Delete failed'); return r.json(); })
      .then(() => { loadBasicData(); })
      .catch(err => { console.error(err); alert('Failed to delete user'); });
}

function incrementUserRuns(userId, delta) {
    const user = currentLeaderboard.find(u => u.id === userId);
    if (!user) return;
    const payload = {
        firstName: user.firstName,
        lastName: user.lastName,
        totalRuns: (user.totalRuns || 0) + delta,
        totalMiles: user.totalMiles,
        appUserId: user.appUserId,
        isRegistered: user.isRegistered
    };
    fetch(`${API_BASE}/leaderboard/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => { if (!r.ok) throw new Error('Update failed'); return r.json(); })
    .then(() => { loadBasicData(); })
    .catch(err => { console.error(err); alert('Failed to update runs'); });
}

function incrementUserMiles(userId, deltaMiles) {
    const user = currentLeaderboard.find(u => u.id === userId);
    if (!user) return;
    const payload = {
        firstName: user.firstName,
        lastName: user.lastName,
        totalRuns: user.totalRuns,
        totalMiles: parseFloat(((user.totalMiles || 0) + deltaMiles).toFixed(2)),
        appUserId: user.appUserId,
        isRegistered: user.isRegistered
    };
    fetch(`${API_BASE}/leaderboard/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => { if (!r.ok) throw new Error('Update failed'); return r.json(); })
    .then(() => { loadBasicData(); })
    .catch(err => { console.error(err); alert('Failed to update miles'); });
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
            totalMiles: parseFloat(formData.get('userTotalMiles')),
            isRegistered: true
        };
        
        console.log('👤 User data to submit:', userData);
        
        const userId = event.target.getAttribute('data-user-id');
        const isUpdate = !!userId;
        const url = isUpdate ? `${API_BASE}/leaderboard/${userId}` : `${API_BASE}/leaderboard`;
        const method = isUpdate ? 'PUT' : 'POST';
        // Send to API
        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        })
        .then(response => {
            console.log('📡 Create user API response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('✅ User added successfully!');
                hideLeaderboardModal();
                event.target.removeAttribute('data-user-id');
                loadBasicData(); // Reload data
                alert(isUpdate ? 'User updated successfully!' : 'User added successfully!');
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
        const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        
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
    console.log('Sync status:', syncStatus);
    console.log('Last sync time:', lastSyncTime);
    console.log('DOM elements check:');
    console.log('- Add Run button:', document.getElementById('addRunBtn'));
    console.log('- Refresh button:', document.getElementById('refreshBtn'));
    console.log('- Runs list:', document.getElementById('runsList'));
    console.log('- Leaderboard container:', document.getElementById('leaderboardContainer'));
    alert('Check console for admin panel test info!');
};

// Auto-refresh data every 30 seconds to keep in sync
setInterval(() => {
    console.log('🔄 Auto-refreshing data...');
    loadBasicData();
}, 30000);

console.log('✅ All functions loaded and ready!');

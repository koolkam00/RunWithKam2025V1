# Run With Kam - Web Admin Panel 🏃‍♂️

A modern, mobile-friendly web application for managing the Run With Kam running calendar. Admins can add, edit, and delete scheduled runs that sync with the iOS mobile app.

## ✨ Features

### 🔐 **Authentication**
- **Secure login system** with admin credentials
- **Session persistence** using localStorage
- **Logout functionality** for security

### 📅 **Calendar Management**
- **Monthly calendar view** with navigation
- **Visual indicators** for days with scheduled runs
- **Date selection** to view specific day's runs
- **Responsive design** for all device sizes

### 🏃 **Run Management**
- **Add new runs** with date, time, location, pace, and description
- **Edit existing runs** with full form validation
- **Delete runs** with confirmation dialog
- **Real-time updates** across the interface

### 📱 **Mobile-First Design**
- **Touch-friendly interface** optimized for iPhone browsers
- **Responsive layout** that works on all screen sizes
- **iOS-specific optimizations** (prevents zoom on input focus)
- **Dark mode support** for better visibility

## 🚀 **Quick Start**

### **Option 1: Local Development**
1. **Download the files** to your computer
2. **Open `index.html`** in any modern web browser
3. **Login credentials**:
   - Username: `admin`
   - Password: `runwithkam2025`

### **Option 2: Web Hosting**
1. **Upload files** to your web hosting service
2. **Access via URL** (e.g., `https://yourdomain.com/admin`)
3. **Use the same login credentials**

### **Option 3: GitHub Pages**
1. **Push to GitHub repository**
2. **Enable GitHub Pages** in repository settings
3. **Access via GitHub Pages URL**

## 🛠️ **Technical Details**

### **Frontend Technologies**
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox and Grid
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome** - Icon library
- **Google Fonts** - Inter font family

### **Data Storage**
- **LocalStorage** - Client-side data persistence
- **JSON format** - Structured run data
- **Real-time sync** - Immediate UI updates

### **Browser Support**
- **Chrome** 80+
- **Safari** 13+
- **Firefox** 75+
- **Edge** 80+
- **Mobile browsers** (iOS Safari, Chrome Mobile)

## 📁 **File Structure**

```
web-admin/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## 🔧 **Customization**

### **Changing Admin Credentials**
Edit the `ADMIN_CREDENTIALS` object in `script.js`:

```javascript
const ADMIN_CREDENTIALS = {
    username: 'your_username',
    password: 'your_password'
};
```

### **Modifying Colors**
Update CSS variables in `styles.css`:

```css
:root {
    --primary-color: #ff6b6b;
    --secondary-color: #6c757d;
    --danger-color: #dc3545;
}
```

### **Adding New Fields**
To add new run properties (e.g., distance, weather):

1. **Update HTML form** in `index.html`
2. **Modify JavaScript** data handling in `script.js`
3. **Update CSS** styling in `styles.css`

## 📱 **Mobile Optimizations**

### **iPhone-Specific Features**
- **Touch-friendly buttons** (44px minimum height)
- **Prevented zoom** on input focus
- **Responsive calendar grid** for small screens
- **Optimized modal layouts** for mobile

### **Responsive Breakpoints**
- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

## 🔌 **API Integration Ready**

The web admin is designed to easily integrate with backend APIs:

```javascript
// Example API integration
async function saveRunToAPI(runData) {
    try {
        const response = await fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(runData)
        });
        return await response.json();
    } catch (error) {
        console.error('Error saving run:', error);
    }
}
```

## 🚨 **Security Considerations**

### **Current Implementation**
- **Client-side authentication** (suitable for basic admin access)
- **LocalStorage data** (persists across browser sessions)

### **Production Recommendations**
- **HTTPS encryption** for all communications
- **Server-side authentication** with JWT tokens
- **Database storage** instead of localStorage
- **Input validation** and sanitization
- **Rate limiting** for login attempts

## 🎨 **Design Features**

### **Visual Elements**
- **Modern card-based design** with subtle shadows
- **Consistent color scheme** matching the mobile app
- **Smooth animations** and transitions
- **Professional typography** with Inter font

### **User Experience**
- **Intuitive navigation** with clear visual hierarchy
- **Immediate feedback** for all user actions
- **Confirmation dialogs** for destructive actions
- **Success notifications** for completed tasks

## 🔄 **Future Enhancements**

### **Planned Features**
- **User management** for multiple admins
- **Bulk operations** for multiple runs
- **Export functionality** (CSV, PDF)
- **Advanced filtering** and search
- **Real-time collaboration** with WebSockets

### **Integration Possibilities**
- **Google Calendar sync**
- **Email notifications**
- **SMS alerts** via Twilio
- **Weather integration** for run planning

## 📞 **Support**

### **Getting Help**
1. **Check browser console** for JavaScript errors
2. **Verify file paths** are correct
3. **Test in different browsers** to isolate issues
4. **Check mobile device compatibility**

### **Common Issues**
- **Calendar not displaying**: Check JavaScript console for errors
- **Login not working**: Verify credentials in script.js
- **Mobile layout issues**: Test responsive breakpoints
- **Data not saving**: Check localStorage permissions

## 📄 **License**

This project is private and proprietary. All rights reserved.

---

**Built with ❤️ for the Run With Kam community**

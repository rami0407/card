import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentPortal } from './components/StudentPortal';
import { 
  Settings, 
  Sparkles,
  Layers,
  Heart,
  Lock,
  User,
  Globe,
  AlertTriangle,
  X
} from 'lucide-react';
import type { Topic } from './services/storage';
import { getTopicById, getTopicByCode } from './services/storage';

type UserRole = 'none' | 'admin' | 'student';

function App() {
  console.log("digital_cards_app version: 1.0.1 - cache bust");
  const [role, setRole] = useState<UserRole>('none');

  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('dc_student_name') || '';
  });
  const [enteredCode, setEnteredCode] = useState('');
  
  // URL and Lookup states
  const [urlActivityId, setUrlActivityId] = useState<string | null>(null);
  const [currentActivity, setCurrentActivity] = useState<Topic | null>(null);
  
  // UX states
  const [isLoading, setIsLoading] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Admin Login states
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // Parse URL on mount
  useEffect(() => {
    const parseUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const activityId = params.get('activity');

      if (activityId) {
        setUrlActivityId(activityId);
        try {
          const topic = await getTopicById(activityId);
          if (topic) {
            setCurrentActivity(topic);
          } else {
            setUrlError('عذراً، رابط الفعالية هذا غير صحيح أو قد تم حذف الفعالية من قِبل المعلم.');
          }
        } catch (err) {
          console.error("فشل قراءة الفعالية من الرابط:", err);
          setUrlError('حدث خطأ أثناء تحميل بيانات الفعالية.');
        }
      }
      setIsLoading(false);
    };

    parseUrl();
  }, []);

  const handleJoinActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!studentName.trim()) {
      setValidationError('الرجاء إدخال اسمك أولاً للدخول.');
      return;
    }

    // Save student name locally for next visits
    localStorage.setItem('dc_student_name', studentName.trim());

    if (urlActivityId && currentActivity) {
      // Case 1: Accessed via direct URL activity link
      if (currentActivity.isPrivate) {
        if (enteredCode.trim().toLowerCase() !== currentActivity.accessCode?.trim().toLowerCase()) {
          setValidationError('رمز الدخول المكتوب غير صحيح. يرجى مراجعة الرمز المرسل من المعلم.');
          return;
        }
      }
      setRole('student');
    } else {
      // Case 2: Accessed landing page directly (Requires code lookup)
      if (!enteredCode.trim()) {
        setValidationError('الرجاء إدخال رمز الفعالية التي تود الانضمام إليها.');
        return;
      }

      setIsLoading(true);
      try {
        const foundActivity = await getTopicByCode(enteredCode);
        if (foundActivity) {
          setCurrentActivity(foundActivity);
          setRole('student');
        } else {
          setValidationError('لم نجد أي فعالية مطابقة لهذا الرمز. تأكد من صحة الرمز المكون من 4 أرقام.');
        }
      } catch (err) {
        console.error("خطأ أثناء البحث عن كود الفعالية:", err);
        setValidationError('حدث خطأ في الشبكة المحلية أثناء البحث عن الفعالية.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);

    const u = adminUsername.trim().toLowerCase();
    const p = adminPassword.trim();

    // Verify admin credentials
    if ((u === 'admin' && (p === 'admin' || p === '2026')) || (u === 'teacher' && p === '123456')) {
      setRole('admin');
      setShowAdminLogin(false);
      setAdminUsername('');
      setAdminPassword('');
    } else {
      setAdminLoginError('اسم المستخدم أو رمز الدخول غير صحيح.');
    }
  };

  const handleBackToLanding = () => {
    setRole('none');
    // Keep name, clear the code for security
    setEnteredCode('');
    setValidationError(null);
  };

  if (role === 'admin') {
    return <AdminDashboard onBackToRoles={handleBackToLanding} />;
  }

  if (role === 'student') {
    return (
      <StudentPortal 
        onBackToRoles={handleBackToLanding}
        initialActivity={currentActivity}
        initialStudentName={studentName}
      />
    );
  }

  return (
    <div className="onboarding-container" dir="rtl">
      {/* Dynamic Background Lights */}
      <div className="glow-circle glow-1"></div>
      <div className="glow-circle glow-2"></div>

      {/* Teacher Dashboard Trigger (Floating) */}
      <button 
        className="btn-teacher-dashboard-trigger" 
        onClick={() => setShowAdminLogin(true)}
        title="دخول المعلمين والمدراء للوحة التحكم"
      >
        <Settings size={18} />
        <span>بوابة المعلم / المدير</span>
      </button>

      {/* Admin Login Modal Overlay */}
      {showAdminLogin && (
        <div className="canvas-modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300 }}>
          <div className="login-card glass-panel animate-scale-up" style={{ position: 'relative', width: '90%', maxWidth: '400px', padding: '30px' }}>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => {
                setShowAdminLogin(false);
                setAdminUsername('');
                setAdminPassword('');
                setAdminLoginError(null);
              }}
              style={{ position: 'absolute', top: '15px', left: '15px' }}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            <form onSubmit={handleAdminSubmit} className="student-login-form" style={{ marginTop: '15px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>دخول المعلم / المدير 🔐</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>يرجى إدخال بيانات الاعتماد للوصول للوحة التحكم وإدارة الفعاليات.</p>

              <div className="form-group">
                <label htmlFor="admin-username-input">اسم المستخدم:</label>
                <input
                  id="admin-username-input"
                  type="text"
                  placeholder="مثال: admin"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginTop: '15px' }}>
                <label htmlFor="admin-password-input">رمز الدخول (كلمة السر):</label>
                <input
                  id="admin-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>

              {adminLoginError && (
                <div className="validation-error-alert" style={{ marginTop: '15px' }}>
                  <AlertTriangle size={16} />
                  <span>{adminLoginError}</span>
                </div>
              )}

              <div className="form-actions mt-6" style={{ marginTop: '25px' }}>
                <button type="submit" className="btn-primary btn-large w-full">
                  <span>تسجيل الدخول</span>
                  <Sparkles size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="onboarding-card glass-panel animate-scale-up">
        
        {/* Header Section */}
        <div className="logo-section">
          <div className="logo-badge glow-badge">
            <Layers size={36} className="logo-icon" />
          </div>
          <h1 className="main-title">العبارات الضوئية</h1>
          <p className="subtitle">اكتب وتحدّث وعبّر عن البطاقات التعليمية التفاعلية</p>
        </div>

        {/* Loading Overlay */}
        {isLoading ? (
          <div className="landing-loading">
            <div className="spinner"></div>
            <span>جاري تحميل الفعالية...</span>
          </div>
        ) : urlError ? (
          /* Error State if URL Activity ID is invalid */
          <div className="landing-error-box animate-slide-in">
            <AlertTriangle size={32} className="icon-gold" />
            <p>{urlError}</p>
            <button 
              className="btn-secondary mt-4 w-full"
              onClick={() => {
                setUrlActivityId(null);
                setCurrentActivity(null);
                setUrlError(null);
              }}
            >
              الانتقال لصفحة الدخول العامة
            </button>
          </div>
        ) : (
          /* Landing Form (Two Inputs in Center) */
          <form onSubmit={handleJoinActivity} className="landing-form-card animate-slide-in">
            
            {/* Header info about direct activity */}
            {currentActivity && (
              <div className="active-activity-banner">
                <span className="activity-label">أنت الآن تنضم لـ:</span>
                <strong className="activity-name">{currentActivity.name}</strong>
                <p className="activity-desc">{currentActivity.description}</p>
              </div>
            )}

            {/* Input 1: Student Name */}
            <div className="form-group">
              <label htmlFor="student-name-field" className="input-label-with-icon">
                <User size={16} className="icon-purple" />
                <span>اسم الطالب:</span>
              </label>
              <input
                id="student-name-field"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="اكتب اسمك الثلاثي هنا..."
                maxLength={25}
                required
                className="input-premium"
              />
            </div>

            {/* Input 2: Access Code (Conditional / Mandatory) */}
            {(!currentActivity || (currentActivity && currentActivity.isPrivate)) ? (
              <div className="form-group">
                <label htmlFor="access-code-field" className="input-label-with-icon">
                  <Lock size={16} className="icon-purple" />
                  <span>رمز الدخول (الكود):</span>
                </label>
                <input
                  id="access-code-field"
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder={
                    currentActivity 
                      ? "أدخل كود الدخول الخاص الذي أرسله المعلم..." 
                      : "أدخل رمز الفعالية الخاصة المكون من 4 أرقام..."
                  }
                  maxLength={10}
                  required
                  className="input-premium font-code"
                />
              </div>
            ) : (
              /* If public activity */
              <div className="public-activity-note">
                <Globe size={16} className="icon-gold" />
                <span>هذه فعالية عامة - سيتم دخولك مباشرة بدون رمز دخول!</span>
              </div>
            )}

            {/* Errors display */}
            {validationError && (
              <div className="validation-error-alert">
                <AlertTriangle size={16} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Submit Action */}
            <button type="submit" className="btn-primary btn-large btn-landing-join w-full">
              <span>انضم للمشاركة والتعلم</span>
              <Sparkles size={18} />
            </button>
            
          </form>
        )}

        {/* Footer */}
        <div className="onboarding-footer mt-6">
          <p>صُمم بـ <Heart size={14} className="heart-icon" /> لمستقبل تعليمي ذكي وتفاعلي</p>
        </div>

      </div>
    </div>
  );
}

export default App;

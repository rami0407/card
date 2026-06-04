import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  FolderPlus, 
  Upload, 
  ChevronLeft, 
  BookOpen, 
  Edit3,
  Layers,
  ArrowRight,
  Sparkles,
  Lock,
  Globe,
  Copy,
  Check,
  Bell,
  BellRing,
  Users,
  UserCheck,
  UserPlus
} from 'lucide-react';
import type { Topic, Card, Teacher, Notification } from '../services/storage';
import { 
  getTopics, 
  addTopic, 
  updateTopic,
  deleteTopic, 
  getCards, 
  addCard, 
  deleteCard,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getTeachers,
  addTeacher,
  deleteTeacher
} from '../services/storage';
import { t, type LangType } from '../services/i18n';
import { DrawingCanvas } from './DrawingCanvas';

interface AdminDashboardProps {
  onBackToRoles: () => void;
  lang: LangType;
  currentTeacher: Teacher | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToRoles, lang, currentTeacher }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [topicCardCounts, setTopicCardCounts] = useState<Record<string, number>>({});

  // Tab and Notification states
  const [currentTab, setCurrentTab] = useState<'activities' | 'teachers'>('activities');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCardForView, setSelectedCardForView] = useState<Card | null>(null);

  // Manage Teachers states
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [teacherMsg, setTeacherMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicCover, setNewTopicCover] = useState<string>('');
  
  // Privacy states
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState('');

  // Copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Drag and drop / file upload states
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit Topic states
  const [showEditTopicForm, setShowEditTopicForm] = useState(false);
  const [editTopicName, setEditTopicName] = useState('');
  const [editTopicDesc, setEditTopicDesc] = useState('');
  const [editTopicCover, setEditTopicCover] = useState<string>('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editAccessCode, setEditAccessCode] = useState('');

  // Fetch topics and calculate stats
  useEffect(() => {
    loadTopicsData();
  }, [currentTeacher]);

  // Fetch cards when selected topic changes
  useEffect(() => {
    if (selectedTopic) {
      loadCardsData(selectedTopic.id);
    }
  }, [selectedTopic]);

  const loadTopicsData = async () => {
    try {
      const allTopics = await getTopics();
      const isSuperAdmin = currentTeacher?.username === 'admin';
      const filteredTopics = isSuperAdmin
        ? allTopics
        : allTopics.filter(t => t.creator === currentTeacher?.username);
      
      setTopics(filteredTopics);
      
      // Load card counts for each topic
      const counts: Record<string, number> = {};
      for (const topic of filteredTopics) {
        const topicCards = await getCards(topic.id);
        counts[topic.id] = topicCards.length;
      }
      setTopicCardCounts(counts);
    } catch (err) {
      console.error("خطأ أثناء جلب المواضيع:", err);
    }
  };

  // Load and poll notifications
  useEffect(() => {
    if (!currentTeacher) return;
    const fetchNotifications = async () => {
      try {
        const list = await getNotifications(currentTeacher.username);
        setNotifications(list);
      } catch (err) {
        console.error("Error loading notifications:", err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentTeacher]);

  // Load teachers if admin switches to teachers tab
  const loadTeachersData = async () => {
    try {
      const list = await getTeachers();
      setTeachers(list);
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  };

  useEffect(() => {
    if (currentTeacher?.username === 'admin' && currentTab === 'teachers') {
      loadTeachersData();
    }
  }, [currentTab, currentTeacher]);

  const handleMarkAllRead = async () => {
    if (!currentTeacher) return;
    try {
      await markAllNotificationsAsRead(currentTeacher.username);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!currentTeacher) return;
    try {
      // 1. Mark as read
      if (!notif.isRead) {
        await markNotificationAsRead(currentTeacher.username, notif.id);
        setNotifications(prev => 
          prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
        );
      }
      
      // 2. Load the target topic
      const allTopics = await getTopics();
      const targetTopic = allTopics.find(t => t.id === notif.topicId);
      if (targetTopic) {
        setCurrentTab('activities');
        setSelectedTopic(targetTopic);
        
        // 3. Load target topic's cards
        const topicCards = await getCards(notif.topicId);
        setCards(topicCards);
        
        // 4. Find card and open DrawingCanvas
        const targetCard = topicCards.find(c => c.id === notif.cardId);
        if (targetCard) {
          setSelectedCardForView(targetCard);
        } else {
          alert(lang === 'ar' ? "عذراً، هذه البطاقة لم تعد موجودة." : "מצטערים, כרטיסייה זו כבר אינה קיימת.");
        }
      } else {
        alert(lang === 'ar' ? "عذراً، هذا الموضوع لم يعد موجوداً." : "מצטערים, נושא זה כבר אינו קיים.");
      }
    } catch (err) {
      console.error("Error handling notification click:", err);
    }
    setShowNotifications(false);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherMsg(null);

    const username = newTeacherUsername.trim().toLowerCase();
    const name = newTeacherName.trim();
    const password = newTeacherPassword.trim();

    if (!username || !name || !password) {
      setTeacherMsg({ text: t('error_missing_teacher_fields', lang), type: 'error' });
      return;
    }

    if (username === 'admin') {
      setTeacherMsg({ text: t('error_username_exists', lang), type: 'error' });
      return;
    }

    try {
      const allTeachers = await getTeachers();
      if (allTeachers.some(t => t.username === username)) {
        setTeacherMsg({ text: t('error_username_exists', lang), type: 'error' });
        return;
      }

      await addTeacher(username, password, name);
      setTeacherMsg({ text: t('teacher_added_success', lang), type: 'success' });
      
      setNewTeacherUsername('');
      setNewTeacherName('');
      setNewTeacherPassword('');
      loadTeachersData();
    } catch (err) {
      console.error("Error adding teacher:", err);
      setTeacherMsg({ text: String(err), type: 'error' });
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (window.confirm(t('delete_teacher_confirm', lang))) {
      try {
        await deleteTeacher(id);
        setTeacherMsg({ text: t('teacher_deleted_success', lang), type: 'success' });
        loadTeachersData();
      } catch (err) {
        console.error("Error deleting teacher:", err);
        setTeacherMsg({ text: String(err), type: 'error' });
      }
    }
  };

  const loadCardsData = async (topicId: string) => {
    try {
      const topicCards = await getCards(topicId);
      setCards(topicCards);
      
      // Update count for just this topic in local state
      setTopicCardCounts(prev => ({
        ...prev,
        [topicId]: topicCards.length
      }));
    } catch (err) {
      console.error("خطأ أثناء جلب بطاقات الموضوع:", err);
    }
  };

  // Convert File to Base64 String
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle Cover Image upload for new Topic
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setNewTopicCover(base64);
      } catch (err) {
        console.error("فشل تحويل الصورة:", err);
      }
    }
  };

  // Manage privacy toggling and generate code
  const handlePrivacyToggle = (val: boolean) => {
    setIsPrivate(val);
    if (val && !accessCode) {
      // Generate random 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setAccessCode(code);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Handle new Topic creation
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !newTopicCover) {
      alert(t('validation_topic_required', lang));
      return;
    }

    try {
      await addTopic(
        newTopicName, 
        newTopicDesc, 
        newTopicCover, 
        isPrivate, 
        isPrivate ? accessCode : undefined,
        currentTeacher?.username || 'admin'
      );
      // Reset form
      setNewTopicName('');
      setNewTopicDesc('');
      setNewTopicCover('');
      setIsPrivate(false);
      setAccessCode('');
      setShowNewTopicForm(false);
      
      // Refresh list
      loadTopicsData();
    } catch (err) {
      alert(t('error_adding_topic', lang) + " " + err);
    }
  };

  // Edit Topic Helpers
  const startEditTopic = () => {
    if (!selectedTopic) return;
    setEditTopicName(selectedTopic.name);
    setEditTopicDesc(selectedTopic.description);
    setEditTopicCover(selectedTopic.coverImage);
    setEditIsPrivate(selectedTopic.isPrivate);
    setEditAccessCode(selectedTopic.accessCode || '');
    setShowEditTopicForm(true);
  };

  const handleEditCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setEditTopicCover(base64);
      } catch (err) {
        console.error("فشل تحويل الصورة:", err);
      }
    }
  };

  const handleEditPrivacyToggle = (val: boolean) => {
    setEditIsPrivate(val);
    if (val && !editAccessCode) {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setEditAccessCode(code);
    }
  };

  const handleSaveEditTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;
    if (!editTopicName.trim() || !editTopicCover) {
      alert(t('validation_topic_required', lang));
      return;
    }

    try {
      const updated = await updateTopic(
        selectedTopic.id,
        editTopicName,
        editTopicDesc,
        editTopicCover,
        editIsPrivate,
        editIsPrivate ? editAccessCode : undefined,
        selectedTopic.creator || 'admin'
      );
      
      setSelectedTopic(updated);
      setShowEditTopicForm(false);
      
      // Refresh list
      loadTopicsData();
    } catch (err) {
      alert(t('error_editing_topic', lang) + " " + err);
    }
  };

  // Handle topic deletion
  const handleDeleteTopic = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering topic selection click
    if (window.confirm(t('delete_topic_confirm', lang))) {
      try {
        await deleteTopic(id);
        loadTopicsData();
        if (selectedTopic?.id === id) {
          setSelectedTopic(null);
        }
      } catch (err) {
        alert(err);
      }
    }
  };

  // Handle uploading files for cards
  const processCardFiles = async (files: FileList) => {
    if (!selectedTopic) return;
    setIsUploading(true);
    setUploadError(null);

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validImageTypes.includes(file.type)) {
        setUploadError(lang === 'ar' ? "بعض الملفات ليست صوراً صالحة. تم تخطيها." : "חלק מהקבצים אינם תמונות תקינות. הם דולגו.");
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        await addCard(selectedTopic.id, base64);
        successCount++;
      } catch (err) {
        console.error(`خطأ أثناء رفع الصورة ${file.name}:`, err);
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      loadCardsData(selectedTopic.id);
    }
  };

  // File Input Change
  const handleCardFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processCardFiles(e.target.files);
    }
  };

  // Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processCardFiles(e.dataTransfer.files);
    }
  };

  // Handle card deletion
  const handleDeleteCard = async (id: string) => {
    if (window.confirm(t('confirm_delete_card', lang))) {
      try {
        await deleteCard(id);
        if (selectedTopic) {
          loadCardsData(selectedTopic.id);
        }
      } catch (err) {
        alert(err);
      }
    }
  };

  // Calculate totals for stats
  const totalTopics = topics.length;
  const totalCards = Object.values(topicCardCounts).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="dashboard-layout">
      {/* Sidebar / Header Controls */}
      <div className="dashboard-header-bar">
        <div className="header-info">
          <button className="back-btn" onClick={onBackToRoles}>
            <ArrowRight size={18} />
            <span>{t('back_main_interface', lang)}</span>
          </button>
          <h1>{t('admin_portal_title', lang)}</h1>
        </div>
        
        {/* Stats Summary & Notification Center */}
        <div className="stats-badges" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Notifications Center Bell */}
          <div className="notifications-wrapper">
            <button 
              className={`btn-notifications ${notifications.some(n => !n.isRead) ? 'has-unread' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              title={t('notifications_bell_tooltip', lang)}
            >
              {notifications.some(n => !n.isRead) ? <BellRing size={20} /> : <Bell size={20} />}
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="notification-count-badge">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notifications-dropdown glass-panel animate-scale-up" style={{ left: lang === 'ar' ? 0 : 'auto', right: lang === 'he' ? 0 : 'auto' }}>
                <div className="notifications-dropdown-header">
                  <h3>{t('notifications_title', lang)}</h3>
                  {notifications.some(n => !n.isRead) && (
                    <button className="btn-mark-all-read" onClick={handleMarkAllRead}>
                      {t('mark_all_read', lang)}
                    </button>
                  )}
                </div>
                <div className="notifications-dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="no-notifications-box">
                      {t('no_notifications', lang)}
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="notification-item-avatar">
                          {notif.studentAvatar}
                        </div>
                        <div className="notification-item-content">
                          <div className="notification-item-desc">
                            {notif.type === 'comment' ? (
                              t('notification_comment', lang, { studentName: notif.studentName, topicName: notif.topicName })
                            ) : (
                              t('notification_reply', lang, { studentName: notif.studentName, topicName: notif.topicName })
                            )}
                          </div>
                          <p className="notification-item-text">{notif.text}</p>
                          <span className="notification-item-time">
                            {new Date(notif.createdAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="stat-badge">
            <BookOpen size={16} />
            <span>{t('total_activities', lang)}: <strong>{totalTopics}</strong></span>
          </div>
          <div className="stat-badge">
            <Layers size={16} />
            <span>{t('total_cards', lang)}: <strong>{totalCards}</strong></span>
          </div>
        </div>
      </div>
      
      {/* Super admin Tab selector */}
      {currentTeacher?.username === 'admin' && (
        <div className="dashboard-tabs" style={{ padding: '0 30px', marginBottom: '20px' }}>
          <button 
            className={`tab-btn ${currentTab === 'activities' ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab('activities');
              setSelectedTopic(null);
            }}
          >
            <Layers size={16} />
            <span>{lang === 'ar' ? 'الفعاليات التعليمية' : 'פעילויות לימודיות'}</span>
          </button>
          <button 
            className={`tab-btn ${currentTab === 'teachers' ? 'active' : ''}`}
            onClick={() => {
              setCurrentTab('teachers');
              setSelectedTopic(null);
            }}
          >
            <Users size={16} />
            <span>{t('manage_teachers_tab', lang)}</span>
          </button>
        </div>
      )}

      {/* Main Panel */}
      <div className="dashboard-content">
        {currentTab === 'teachers' && currentTeacher?.username === 'admin' ? (
          /* ================= TEACHERS MANAGEMENT VIEW ================= */
          <div className="teachers-management animate-fade-in" style={{ padding: '0 10px' }}>
            <div className="section-title-bar">
              <h2>{t('manage_teachers_tab', lang)}</h2>
            </div>

            {teacherMsg && (
              <div className={`teacher-alert ${teacherMsg.type}`}>
                {teacherMsg.text}
              </div>
            )}

            <div className="teachers-management-grid">
              
              {/* Form to Add Teacher */}
              <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', fontWeight: 700 }}>
                  <UserPlus size={18} className="icon-purple" />
                  {t('add_teacher_title', lang)}
                </h3>
                
                <form onSubmit={handleAddTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div className="form-group">
                    <label htmlFor="teacher-full-name">{t('teacher_name', lang)}</label>
                    <input 
                      id="teacher-full-name"
                      type="text" 
                      placeholder={lang === 'ar' ? "مثال: المعلمة ديما" : "לדוגמה: המורה דימה"}
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="teacher-username-field">{t('teacher_username', lang)}</label>
                    <input 
                      id="teacher-username-field"
                      type="text" 
                      placeholder="e.g. deema_math"
                      value={newTeacherUsername}
                      onChange={(e) => setNewTeacherUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="teacher-password-field">{t('teacher_password', lang)}</label>
                    <input 
                      id="teacher-password-field"
                      type="password" 
                      placeholder="••••••••"
                      value={newTeacherPassword}
                      onChange={(e) => setNewTeacherPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full" style={{ marginTop: '10px' }}>
                    <Plus size={16} />
                    <span>{t('add_teacher_btn', lang)}</span>
                  </button>
                </form>
              </div>

              {/* List of Teachers */}
              <div className="glass-panel" style={{ padding: '25px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', fontWeight: 700 }}>
                  <UserCheck size={18} className="icon-purple" />
                  {t('teachers_list_title', lang, { count: teachers.length })}
                </h3>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {teachers.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                      {lang === 'ar' ? "لا يوجد معلمون مضافون حالياً." : "אין מורים מתווספים כעת."}
                    </p>
                  ) : (
                    teachers.map((tcher) => (
                      <div key={tcher.id} className="teacher-item-card">
                        <div className="teacher-item-info">
                          <span className="teacher-item-name">{tcher.name}</span>
                          <span className="teacher-item-username">@{tcher.username}</span>
                          <span className="teacher-item-date">
                            {t('teacher_created_at', lang, { date: new Date(tcher.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'he-IL') })}
                          </span>
                        </div>
                        <button 
                          type="button"
                          className="delete-topic-btn"
                          onClick={() => handleDeleteTeacher(tcher.id)}
                          title={t('delete_teacher_btn', lang)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : !selectedTopic ? (
          /* ================= TOPICS VIEW ================= */
          <div className="topics-management">
            <div className="section-title-bar">
              <h2>{t('topics_list_header', lang, { count: totalTopics })}</h2>
              <button 
                className="btn-primary" 
                onClick={() => {
                  setIsPrivate(false);
                  setAccessCode('');
                  setShowNewTopicForm(true);
                }}
              >
                <Plus size={18} />
                <span>{t('create_new_activity', lang)}</span>
              </button>
            </div>

            {/* Create Topic Form Card */}
            {showNewTopicForm && (
              <div className="form-card-overlay">
                <form onSubmit={handleCreateTopic} className="form-card animate-slide-in">
                  <div className="form-header">
                    <h3>
                      <FolderPlus size={20} className="icon-purple" />
                      {t('add_topic_modal_title', lang)}
                    </h3>
                    <button 
                      type="button" 
                      className="btn-icon-close" 
                      onClick={() => setShowNewTopicForm(false)}
                    >
                      <XIcon />
                    </button>
                  </div>

                  <div className="form-body">
                    <div className="form-group">
                      <label htmlFor="topic-name">{t('topic_name_label', lang)}</label>
                      <input 
                        id="topic-name"
                        type="text" 
                        placeholder={t('topic_name_placeholder', lang)}
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="topic-desc">{t('topic_desc_label', lang)}</label>
                      <textarea 
                        id="topic-desc"
                        placeholder={t('topic_desc_placeholder', lang)}
                        value={newTopicDesc}
                        onChange={(e) => setNewTopicDesc(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* Access Control Settings */}
                    <div className="form-group">
                      <label>{t('privacy_settings_label', lang)}</label>
                      <div className="privacy-toggle-group">
                        <button
                          type="button"
                          className={`privacy-toggle-btn ${!isPrivate ? 'active' : ''}`}
                          onClick={() => handlePrivacyToggle(false)}
                        >
                          <Globe size={16} />
                          <span>{t('public_mode', lang)}</span>
                        </button>
                        <button
                          type="button"
                          className={`privacy-toggle-btn ${isPrivate ? 'active' : ''}`}
                          onClick={() => handlePrivacyToggle(true)}
                        >
                          <Lock size={16} />
                          <span>{t('private_mode', lang)}</span>
                        </button>
                      </div>

                      {isPrivate && (
                        <div className="code-generation-preview">
                          <span>{t('generated_code_label', lang)}</span>
                          <strong className="generated-code-value">{accessCode}</strong>
                          <button
                            type="button"
                            className="btn-regenerate-code"
                            onClick={() => {
                              const code = Math.floor(1000 + Math.random() * 9000).toString();
                              setAccessCode(code);
                            }}
                          >
                            {t('generate_other_code', lang)}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>{t('topic_cover_label', lang)}</label>
                      <div className="cover-upload-zone">
                        {newTopicCover ? (
                          <div className="cover-preview">
                            <img src={newTopicCover} alt="معاينة الغلاف" />
                            <button 
                              type="button" 
                              className="btn-danger-floating" 
                              onClick={() => setNewTopicCover('')}
                            >
                              <Trash2 size={16} />
                              <span>{lang === 'ar' ? "حذف وصورة أخرى" : "מחק ותמונה אחרת"}</span>
                            </button>
                          </div>
                        ) : (
                          <label className="upload-placeholder">
                            <Upload size={32} />
                            <span>{t('choose_cover_btn', lang)}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleCoverChange} 
                              style={{ display: 'none' }}
                              required
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-footer">
                    <button type="submit" className="btn-success">{t('save_changes_btn', lang)}</button>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setShowNewTopicForm(false)}
                    >
                      {t('cancel_btn', lang)}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Topics Grid */}
            {topics.length === 0 ? (
              <div className="empty-state-box">
                <Sparkles size={40} className="icon-glow" />
                <h3>{lang === 'ar' ? 'لا توجد فعاليات مضافة بعد' : 'אין פעילויות שנוספו עדיין'}</h3>
                <p>{lang === 'ar' ? 'ابدأ بإنشاء موضوعك الأول لتمكين الطلاب من استعراض البطاقات والتعلم.' : 'התחל ביצירת הנושא הראשון שלך כדי לאפשר לתלמידים לעיין בכרטיסיות וללמוד.'}</p>
                <button 
                  className="btn-primary mt-4" 
                  onClick={() => setShowNewTopicForm(true)}
                >
                  <Plus size={18} />
                  <span>{t('create_new_activity', lang)}</span>
                </button>
              </div>
            ) : (
              <div className="topics-grid">
                {topics.map((topic) => (
                  <div 
                    key={topic.id} 
                    className="topic-dashboard-card"
                    onClick={() => setSelectedTopic(topic)}
                  >
                    <div className="card-image-wrap">
                      <img src={topic.coverImage} alt={topic.name} />
                      <div className="card-badge">
                        <span>{t('topic_card_count', lang, { count: topicCardCounts[topic.id] || 0 })}</span>
                      </div>
                      
                      {/* Privacy Indicator Badge */}
                      <div className={`privacy-indicator-badge ${topic.isPrivate ? 'private' : 'public'}`}>
                        {topic.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                        <span>{topic.isPrivate ? t('activity_private', lang) : t('activity_public', lang)}</span>
                      </div>
                    </div>
                    
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column' }}>
                      <h3>{topic.name}</h3>
                      <p style={{ flexGrow: 1 }}>{topic.description || t('empty_desc_placeholder', lang)}</p>
                      
                      {currentTeacher?.username === 'admin' && (
                        <div className="topic-creator-badge">
                          <span>{t('creator_label', lang, { name: topic.creator === 'admin' ? t('admin_label', lang) : topic.creator || 'admin' })}</span>
                        </div>
                      )}
                      
                      <div className="card-actions">
                        <button className="manage-cards-link">
                          <span>{t('manage_cards', lang)}</span>
                          <ChevronLeft size={16} />
                        </button>
                        <button 
                          className="delete-topic-btn"
                          onClick={(e) => handleDeleteTopic(topic.id, e)}
                          title={t('delete_topic_btn', lang)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ================= CARDS DETAILS VIEW ================= */
          <div className="cards-management">
            <div className="selected-topic-bar">
              <button className="back-link" onClick={() => setSelectedTopic(null)}>
                <ArrowRight size={18} />
                <span>{t('back_activities_list', lang)}</span>
              </button>
              
              <div className="topic-meta-wrapper">
                <div className="topic-meta">
                  <h2>{t('manage_cards_topic', lang)} <span className="text-purple">{selectedTopic.name}</span></h2>
                  <p>{selectedTopic.description}</p>
                  <button 
                    type="button"
                    className="btn-edit-topic"
                    onClick={startEditTopic}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#c084fc',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginTop: '10px',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <Edit3 size={14} />
                    <span>{t('edit_activity_settings', lang)}</span>
                  </button>
                </div>
                
                {/* NEW: Link sharing panel for student distribution */}
                <div className="share-link-panel glass-panel">
                  <div className="share-header">
                    <div className="status-indicator">
                      <span className={`status-dot ${selectedTopic.isPrivate ? 'private' : 'public'}`}></span>
                      <span>{selectedTopic.isPrivate ? `${t('activity_private', lang)} (${selectedTopic.accessCode})` : t('activity_public', lang)}</span>
                    </div>
                    <div className="share-action-buttons">
                      {selectedTopic.isPrivate && (
                        <button
                          className="btn-share-action"
                          onClick={() => copyToClipboard(selectedTopic.accessCode || '', 'code')}
                        >
                          {copiedCode ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                          <span>{copiedCode ? t('copied_code_alert', lang) : t('copy_code_btn', lang)}</span>
                        </button>
                      )}
                      <button
                        className="btn-share-action highlight"
                        onClick={() => {
                          const baseUrl = window.location.href.split('?')[0].split('#')[0];
                          copyToClipboard(`${baseUrl}?activity=${selectedTopic.id}`, 'link');
                        }}
                      >
                        {copiedLink ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        <span>{copiedLink ? t('copied_link_alert', lang) : t('copy_share_link', lang)}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="share-link-input-group">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.href.split('?')[0].split('#')[0]}?activity=${selectedTopic.id}`} 
                      className="share-link-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="cards-manager-grid">
              
              {/* Uploader Section */}
              <div className="uploader-column">
                <div className="glass-panel uploader-panel">
                  <h3>
                    <Upload size={20} className="icon-purple" />
                    {t('upload_cards_header', lang)}
                  </h3>
                  <p className="subtitle">{t('upload_cards_desc', lang)}</p>

                  <div 
                    className={`drag-drop-zone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input 
                      type="file" 
                      id="card-files" 
                      multiple 
                      accept="image/*"
                      onChange={handleCardFilesUpload}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="card-files" className="drag-drop-label">
                      <ImageIcon size={48} className="upload-icon" />
                      <span className="title">{t('drag_drop_images', lang)}</span>
                      <span className="or">{lang === 'ar' ? 'أو' : 'או'}</span>
                      <span className="browse-btn">{t('browse_files', lang)}</span>
                      <span className="limits">{t('supported_formats', lang)}</span>
                    </label>
                  </div>

                  {isUploading && (
                    <div className="upload-progress-info">
                      <div className="spinner"></div>
                      <span>{t('uploading_progress', lang)}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="error-message">
                      <p>{uploadError}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cards Grid Section */}
              <div className="cards-display-column">
                <div className="section-header">
                  <h3>{t('added_cards_header', lang, { count: cards.length })}</h3>
                </div>

                {cards.length === 0 ? (
                  <div className="empty-state-box inline-empty">
                    <ImageIcon size={32} />
                    <p>{t('no_cards_in_topic', lang)}</p>
                    <p className="small">{t('no_cards_desc', lang)}</p>
                  </div>
                ) : (
                  <div className="cards-thumbnail-grid">
                    {cards.map((card) => (
                      <div key={card.id} className="card-thumbnail-item" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img src={card.image} alt={t('modal_title', lang)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        <div className="hover-delete-overlay">
                          <button 
                            className="delete-card-btn"
                            onClick={() => handleDeleteCard(card.id)}
                            title={t('delete_card_tooltip', lang)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Edit Topic Form Card */}
        {showEditTopicForm && (
          <div className="form-card-overlay">
            <form onSubmit={handleSaveEditTopic} className="form-card animate-slide-in">
              <div className="form-header">
                <h3>
                  <Edit3 size={20} className="icon-purple" />
                  {t('edit_modal_title', lang)}
                </h3>
                <button 
                  type="button" 
                  className="btn-icon-close" 
                  onClick={() => setShowEditTopicForm(false)}
                >
                  <XIcon />
                </button>
              </div>

              <div className="form-body">
                <div className="form-group">
                  <label htmlFor="edit-topic-name">{t('topic_name_label', lang)}</label>
                  <input 
                    id="edit-topic-name"
                    type="text" 
                    placeholder={t('topic_name_placeholder', lang)}
                    value={editTopicName}
                    onChange={(e) => setEditTopicName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-topic-desc">{t('topic_desc_label', lang)}</label>
                  <textarea 
                    id="edit-topic-desc"
                    placeholder={t('topic_desc_placeholder', lang)}
                    value={editTopicDesc}
                    onChange={(e) => setEditTopicDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Access Control Settings */}
                <div className="form-group">
                  <label>{t('privacy_settings_label', lang)}</label>
                  <div className="privacy-toggle-group">
                    <button
                      type="button"
                      className={`privacy-toggle-btn ${!editIsPrivate ? 'active' : ''}`}
                      onClick={() => handleEditPrivacyToggle(false)}
                    >
                      <Globe size={16} />
                      <span>{t('public_mode', lang)}</span>
                    </button>
                    <button
                      type="button"
                      className={`privacy-toggle-btn ${editIsPrivate ? 'active' : ''}`}
                      onClick={() => handleEditPrivacyToggle(true)}
                    >
                      <Lock size={16} />
                      <span>{t('private_mode', lang)}</span>
                    </button>
                  </div>

                  {editIsPrivate && (
                    <div className="code-generation-preview">
                      <span>{t('generated_code_label', lang)}</span>
                      <strong className="generated-code-value">{editAccessCode}</strong>
                      <button
                        type="button"
                        className="btn-regenerate-code"
                        onClick={() => {
                          const code = Math.floor(1000 + Math.random() * 9000).toString();
                          setEditAccessCode(code);
                        }}
                      >
                        {t('generate_other_code', lang)}
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>{t('topic_cover_label', lang)}</label>
                  <div className="file-uploader-wrap">
                    <input 
                      type="file" 
                      id="edit-cover-upload" 
                      accept="image/*" 
                      onChange={handleEditCoverChange}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="edit-cover-upload" className="btn-file-select">
                      <ImageIcon size={16} />
                      <span>{t('choose_cover_new_btn', lang)}</span>
                    </label>
                  </div>

                  {editTopicCover && (
                    <div className="cover-preview mt-3">
                      <img src={editTopicCover} alt={t('topic_cover_label', lang)} />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowEditTopicForm(false)}
                >
                  {t('cancel_btn', lang)}
                </button>
                <button type="submit" className="btn-primary">
                  <span>{t('save_changes_btn', lang)}</span>
                  <Sparkles size={16} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Drawing Canvas Modal for viewing discussions */}
      {selectedCardForView && (
        <DrawingCanvas
          imageSrc={selectedCardForView.image}
          cardId={selectedCardForView.id}
          onClose={() => setSelectedCardForView(null)}
          lang={lang}
          currentUser={{
            name: currentTeacher?.name || 'معلم',
            avatar: currentTeacher?.username === 'admin' ? '👑' : '👨‍🏫'
          }}
        />
      )}
    </div>
  );
};

// Inline X Icon Component to avoid imports
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

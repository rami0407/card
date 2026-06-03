import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  FolderPlus, 
  Upload, 
  ChevronLeft, 
  BookOpen, 
  Layers,
  ArrowRight,
  Sparkles,
  Lock,
  Globe,
  Copy,
  Check
} from 'lucide-react';
import type { Topic, Card } from '../services/storage';
import { 
  getTopics, 
  addTopic, 
  deleteTopic, 
  getCards, 
  addCard, 
  deleteCard 
} from '../services/storage';

interface AdminDashboardProps {
  onBackToRoles: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToRoles }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [topicCardCounts, setTopicCardCounts] = useState<Record<string, number>>({});

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

  // Fetch topics and calculate stats
  useEffect(() => {
    loadTopicsData();
  }, []);

  // Fetch cards when selected topic changes
  useEffect(() => {
    if (selectedTopic) {
      loadCardsData(selectedTopic.id);
    }
  }, [selectedTopic]);

  const loadTopicsData = async () => {
    try {
      const allTopics = await getTopics();
      setTopics(allTopics);
      
      // Load card counts for each topic
      const counts: Record<string, number> = {};
      for (const topic of allTopics) {
        const topicCards = await getCards(topic.id);
        counts[topic.id] = topicCards.length;
      }
      setTopicCardCounts(counts);
    } catch (err) {
      console.error("خطأ أثناء جلب المواضيع:", err);
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
      alert("الرجاء إدخال اسم الموضوع وصورة الغلاف");
      return;
    }

    try {
      await addTopic(
        newTopicName, 
        newTopicDesc, 
        newTopicCover, 
        isPrivate, 
        isPrivate ? accessCode : undefined
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
      alert("حدث خطأ أثناء إضافة الموضوع: " + err);
    }
  };

  // Handle topic deletion
  const handleDeleteTopic = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering topic selection click
    if (window.confirm("هل أنت متأكد من حذف هذا الموضوع؟ سيتم حذف جميع البطاقات التابعة له أيضاً.")) {
      try {
        await deleteTopic(id);
        loadTopicsData();
        if (selectedTopic?.id === id) {
          setSelectedTopic(null);
        }
      } catch (err) {
        alert("فشل حذف الموضوع: " + err);
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
        setUploadError("بعض الملفات ليست صوراً صالحة. تم تخطيها.");
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
    if (window.confirm("هل أنت متأكد من حذف هذه البطاقة؟")) {
      try {
        await deleteCard(id);
        if (selectedTopic) {
          loadCardsData(selectedTopic.id);
        }
      } catch (err) {
        alert("فشل حذف البطاقة: " + err);
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
            <span>العودة للرئيسية</span>
          </button>
          <h1>لوحة تحكم المعلم / المدير</h1>
        </div>
        
        {/* Stats Summary */}
        <div className="stats-badges">
          <div className="stat-badge">
            <BookOpen size={16} />
            <span>الفعاليات: <strong>{totalTopics}</strong></span>
          </div>
          <div className="stat-badge">
            <Layers size={16} />
            <span>البطاقات المرفوعة: <strong>{totalCards}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="dashboard-content">
        {!selectedTopic ? (
          /* ================= TOPICS VIEW ================= */
          <div className="topics-management">
            <div className="section-title-bar">
              <h2>المواضيع والفعاليات المتاحة</h2>
              <button 
                className="btn-primary" 
                onClick={() => {
                  setIsPrivate(false);
                  setAccessCode('');
                  setShowNewTopicForm(true);
                }}
              >
                <Plus size={18} />
                <span>إنشاء فعالية جديدة</span>
              </button>
            </div>

            {/* Create Topic Form Card */}
            {showNewTopicForm && (
              <div className="form-card-overlay">
                <form onSubmit={handleCreateTopic} className="form-card animate-slide-in">
                  <div className="form-header">
                    <h3>
                      <FolderPlus size={20} className="icon-purple" />
                      إضافة فعالية تعليمية جديدة
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
                      <label htmlFor="topic-name">اسم الموضوع:</label>
                      <input 
                        id="topic-name"
                        type="text" 
                        placeholder="مثال: حيوانات الغابة، حروف الهجاء، الفضاء..."
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="topic-desc">وصف بسيط (اختياري):</label>
                      <textarea 
                        id="topic-desc"
                        placeholder="اكتب نبذة قصيرة للطلاب حول محتوى هذا الدرس..."
                        value={newTopicDesc}
                        onChange={(e) => setNewTopicDesc(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* NEW: Access Control Settings */}
                    <div className="form-group">
                      <label>إعدادات الخصوصية والوصول للطلاب:</label>
                      <div className="privacy-toggle-group">
                        <button
                          type="button"
                          className={`privacy-toggle-btn ${!isPrivate ? 'active' : ''}`}
                          onClick={() => handlePrivacyToggle(false)}
                        >
                          <Globe size={16} />
                          <span>عامة (بدون كود)</span>
                        </button>
                        <button
                          type="button"
                          className={`privacy-toggle-btn ${isPrivate ? 'active' : ''}`}
                          onClick={() => handlePrivacyToggle(true)}
                        >
                          <Lock size={16} />
                          <span>خاصة (برمز دخول)</span>
                        </button>
                      </div>

                      {isPrivate && (
                        <div className="code-generation-preview">
                          <span>رمز الدخول المولد للفعالية:</span>
                          <strong className="generated-code-value">{accessCode}</strong>
                          <button
                            type="button"
                            className="btn-regenerate-code"
                            onClick={() => {
                              const code = Math.floor(1000 + Math.random() * 9000).toString();
                              setAccessCode(code);
                            }}
                          >
                            توليد رمز آخر
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>صورة غلاف الموضوع:</label>
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
                              <span>حذف وصورة أخرى</span>
                            </button>
                          </div>
                        ) : (
                          <label className="upload-placeholder">
                            <Upload size={32} />
                            <span>اضغط هنا لرفع صورة الغلاف</span>
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
                    <button type="submit" className="btn-success">حفظ وإنشاء الفعالية</button>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setShowNewTopicForm(false)}
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Topics Grid */}
            {topics.length === 0 ? (
              <div className="empty-state-box">
                <Sparkles size={40} className="icon-glow" />
                <h3>لا توجد فعاليات مضافة بعد</h3>
                <p>ابدأ بإنشاء موضوعك الأول لتمكين الطلاب من استعراض البطاقات والتعلم.</p>
                <button 
                  className="btn-primary mt-4" 
                  onClick={() => setShowNewTopicForm(true)}
                >
                  <Plus size={18} />
                  <span>إنشاء فعالية الآن</span>
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
                        <span>{topicCardCounts[topic.id] || 0} بطاقة</span>
                      </div>
                      
                      {/* Privacy Indicator Badge */}
                      <div className={`privacy-indicator-badge ${topic.isPrivate ? 'private' : 'public'}`}>
                        {topic.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                        <span>{topic.isPrivate ? 'خاصة برمز' : 'عامة'}</span>
                      </div>
                    </div>
                    
                    <div className="card-body">
                      <h3>{topic.name}</h3>
                      <p>{topic.description || 'لا يوجد وصف مضاف لهذه الفعالية.'}</p>
                      
                      <div className="card-actions">
                        <button className="manage-cards-link">
                          <span>إدارة الفعالية</span>
                          <ChevronLeft size={16} />
                        </button>
                        <button 
                          className="delete-topic-btn"
                          onClick={(e) => handleDeleteTopic(topic.id, e)}
                          title="حذف الفعالية بالكامل"
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
                <span>العودة لقائمة الفعاليات</span>
              </button>
              
              <div className="topic-meta-wrapper">
                <div className="topic-meta">
                  <h2>إدارة بطاقات الموضوع: <span className="text-purple">{selectedTopic.name}</span></h2>
                  <p>{selectedTopic.description}</p>
                </div>
                
                {/* NEW: Link sharing panel for student distribution */}
                <div className="share-link-panel glass-panel">
                  <div className="share-header">
                    <div className="status-indicator">
                      <span className={`status-dot ${selectedTopic.isPrivate ? 'private' : 'public'}`}></span>
                      <span>{selectedTopic.isPrivate ? `فعالية خاصة (الرمز: ${selectedTopic.accessCode})` : 'فعالية عامة (مفتوحة للجميع)'}</span>
                    </div>
                    <div className="share-action-buttons">
                      {selectedTopic.isPrivate && (
                        <button
                          className="btn-share-action"
                          onClick={() => copyToClipboard(selectedTopic.accessCode || '', 'code')}
                        >
                          {copiedCode ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                          <span>{copiedCode ? 'تم نسخ الرمز' : 'نسخ رمز الدخول'}</span>
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
                        <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ رابط المشاركة للطلاب'}</span>
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
                    رفع بطاقات جديدة للموضوع
                  </h3>
                  <p className="subtitle">يمكنك رفع عدة صور للبطاقات دفعة واحدة لتظهر للطلاب مباشرة.</p>

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
                      <span className="title">اسحب الصور وأفلتها هنا</span>
                      <span className="or">أو</span>
                      <span className="browse-btn">تصفح من جهازك</span>
                      <span className="limits">صيغ الصور المدعومة: PNG, JPG, WEBP</span>
                    </label>
                  </div>

                  {isUploading && (
                    <div className="upload-progress-info">
                      <div className="spinner"></div>
                      <span>جاري رفع وتخزين الصور محلياً...</span>
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
                  <h3>البطاقات المضافة حالياً ({cards.length})</h3>
                </div>

                {cards.length === 0 ? (
                  <div className="empty-state-box inline-empty">
                    <ImageIcon size={32} />
                    <p>لا توجد بطاقات في هذا الموضوع حتى الآن.</p>
                    <p className="small">استخدم نموذج الرفع الموضح بالجانب لإضافة صورك الأولى.</p>
                  </div>
                ) : (
                  <div className="cards-thumbnail-grid">
                    {cards.map((card) => (
                      <div key={card.id} className="card-thumbnail-item" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img src={card.image} alt="بطاقة تعليمية" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        <div className="hover-delete-overlay">
                          <button 
                            className="delete-card-btn"
                            onClick={() => handleDeleteCard(card.id)}
                            title="حذف البطاقة"
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
      </div>
    </div>
  );
};

// Inline X Icon Component to avoid imports
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

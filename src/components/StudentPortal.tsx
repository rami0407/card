import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Layers, 
  ChevronLeft,
  Smile
} from 'lucide-react';
import type { Topic, Card } from '../services/storage';
import { getTopics, getCards } from '../services/storage';
import { DrawingCanvas } from './DrawingCanvas';

interface StudentPortalProps {
  onBackToRoles: () => void;
  initialActivity?: Topic | null;
  initialStudentName?: string;
}

const AVATARS = [
  '😊', '🦁', '🦊', '🐼', '🦖', '🚀', '🎨', '🌟', '⚽', '🦄'
];

export const StudentPortal: React.FC<StudentPortalProps> = ({ 
  onBackToRoles, 
  initialActivity, 
  initialStudentName 
}) => {
  const [studentName, setStudentName] = useState(() => {
    return initialStudentName || localStorage.getItem('dc_student_name') || '';
  });
  const [studentAvatar, setStudentAvatar] = useState(() => {
    return localStorage.getItem('dc_student_avatar') || AVATARS[0];
  });
  const [isNameSet, setIsNameSet] = useState(!!initialStudentName || !!studentName);
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(initialActivity || null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Fetch topics
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const allTopics = await getTopics();
        setTopics(allTopics);
      } catch (err) {
        console.error("فشل تحميل المواضيع للطلاب:", err);
      }
    };
    loadTopics();
  }, []);

  // Fetch cards when student selects a topic
  useEffect(() => {
    if (selectedTopic) {
      const loadCards = async () => {
        try {
          const topicCards = await getCards(selectedTopic.id);
          setCards(topicCards);
        } catch (err) {
          console.error("فشل تحميل البطاقات:", err);
        }
      };
      loadCards();
    }
  }, [selectedTopic]);

  const handleSaveStudentName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    
    localStorage.setItem('dc_student_name', studentName.trim());
    localStorage.setItem('dc_student_avatar', studentAvatar);
    setIsNameSet(true);
  };

  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  const handleDeselectTopic = () => {
    if (initialActivity) {
      onBackToRoles();
    } else {
      setSelectedTopic(null);
      setCards([]);
    }
  };

  const handleResetStudent = () => {
    localStorage.removeItem('dc_student_name');
    localStorage.removeItem('dc_student_avatar');
    setStudentName('');
    setStudentAvatar(AVATARS[0]);
    setIsNameSet(false);
  };

  return (
    <div className="student-layout">
      {/* Student Welcome / Selection Screen */}
      {!isNameSet ? (
        <div className="student-login-container">
          <div className="login-card glass-panel animate-scale-up">
            <div className="avatar-glow">{studentAvatar}</div>
            
            <form onSubmit={handleSaveStudentName} className="student-login-form">
              <h2>مرحباً بك يا بطل! 🌟</h2>
              <p>أدخل اسمك واختر صورتك الرمزية لتبدأ رحلتك التفاعلية معنا.</p>

              <div className="form-group">
                <label htmlFor="student-name-input">اكتب اسمك هنا:</label>
                <input
                  id="student-name-input"
                  type="text"
                  placeholder="مثال: أحمد، سارة، فاطمة..."
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  maxLength={15}
                  required
                  autoFocus
                />
              </div>

              {/* Avatar Selector */}
              <div className="form-group">
                <label>اختر الرمز المفضل لديك:</label>
                <div className="avatar-grid">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      className={`avatar-btn ${studentAvatar === av ? 'active' : ''}`}
                      onClick={() => setStudentAvatar(av)}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-actions mt-6">
                <button type="submit" className="btn-primary btn-large w-full">
                  <span>أنا مستعد للبدء!</span>
                  <Sparkles size={18} />
                </button>
                
                <button 
                  type="button" 
                  className="btn-secondary w-full mt-2" 
                  onClick={onBackToRoles}
                >
                  العودة للواجهة الرئيسية
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ================= LOGGED IN PORTAL ================= */
        <div className="student-portal-content">
          
          {/* Header Bar */}
          <div className="student-header-bar">
            <div className="student-profile-info">
              <span className="profile-avatar">{studentAvatar}</span>
              <div className="profile-text">
                <h3>أهلاً بك، {studentName}! 👋</h3>
                <button className="btn-link" onClick={handleResetStudent}>
                  (تغيير الاسم)
                </button>
              </div>
            </div>

            <div className="student-header-actions">
              <button className="back-btn" onClick={onBackToRoles}>
                <span>واجهة تسجيل الدخول</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {!selectedTopic ? (
            /* ================= SELECT TOPIC VIEW ================= */
            <div className="topics-explorer animate-fade-in">
              <div className="explorer-hero">
                <h1>اختر موضوعاً لتستعرض بطاقاته 📚</h1>
                <p>اضغط على أي موضوع أدناه لتشاهد البطاقات التعليمية التي صممها لك المعلم.</p>
              </div>

              {topics.length === 0 ? (
                <div className="student-empty-state">
                  <Smile size={48} className="empty-icon" />
                  <h3>لا توجد مواضيع متاحة الآن</h3>
                  <p>اطلب من معلمك أو مدير المدرسة رفع مواضيع وبطاقات تعليمية جديدة.</p>
                </div>
              ) : (
                <div className="student-topics-grid">
                  {topics.map((topic) => (
                    <div 
                      key={topic.id} 
                      className="student-topic-card"
                      onClick={() => handleSelectTopic(topic)}
                    >
                      <div className="topic-cover-wrap">
                        <img src={topic.coverImage} alt={topic.name} />
                      </div>
                      <div className="topic-info">
                        <h3>{topic.name}</h3>
                        <p>{topic.description || 'تحدّث واكتب على بطاقات هذا الموضوع الرائع.'}</p>
                        <div className="topic-action-bar">
                          <span>تصفح البطاقات</span>
                          <ChevronLeft size={16} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ================= VIEW CARDS GRID ================= */
            <div className="cards-explorer animate-fade-in">
              
              {/* Explorer Subheader */}
              <div className="explorer-subheader">
                <button className="back-link" onClick={handleDeselectTopic}>
                  <ArrowRight size={18} />
                  <span>العودة لقائمة المواضيع</span>
                </button>
                <div className="selected-topic-title">
                  <h2>موضوع الدرس: <span className="highlight">{selectedTopic.name}</span></h2>
                </div>
              </div>

              <div className="cards-instructions">
                <Sparkles size={18} className="icon-gold" />
                <p>اختر البطاقة التي تود التحدث والكتابة عنها بالضغط عليها لتكبيرها والرسم عليها!</p>
              </div>

              {cards.length === 0 ? (
                <div className="student-empty-state">
                  <Layers size={40} className="empty-icon" />
                  <h3>هذا الموضوع فارغ حالياً</h3>
                  <p>لم يقم المعلم بإضافة بطاقات إلى هذا الموضوع بعد. يرجى مراجعة المواضيع الأخرى.</p>
                </div>
              ) : (
                <div className="student-cards-grid">
                  {cards.map((card) => (
                    <div 
                      key={card.id} 
                      className="student-card-item"
                      onClick={() => setSelectedCard(card)}
                    >
                      <div className="card-image-container">
                        <img src={card.image} alt="بطاقة تعليمية للطلاب" />
                      </div>
                      <div className="card-hover-indicator">
                        <Sparkles size={20} />
                        <span>اضغط للكتابة والرسم</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drawing Canvas Modal */}
      {selectedCard && (
        <DrawingCanvas
          imageSrc={selectedCard.image}
          cardId={selectedCard.id}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
};

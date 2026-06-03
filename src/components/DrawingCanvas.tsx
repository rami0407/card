import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare,
  Send,
  CornerDownLeft
} from 'lucide-react';
import type { CardComment } from '../services/storage';
import { 
  getComments, 
  addComment, 
  addReply
} from '../services/storage';

interface DrawingCanvasProps {
  imageSrc: string;
  onClose: () => void;
  cardId: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ imageSrc, onClose, cardId }) => {
  // Comments & Replies states
  const [comments, setComments] = useState<CardComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  const currentStudentName = localStorage.getItem('dc_student_name') || 'زائر';
  const currentStudentAvatar = localStorage.getItem('dc_student_avatar') || '😊';

  const loadComments = async () => {
    try {
      const list = await getComments(cardId);
      setComments(list);
    } catch (err) {
      console.error("فشل تحميل التعليقات:", err);
    }
  };

  useEffect(() => {
    loadComments();
  }, [cardId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      await addComment(cardId, currentStudentName, currentStudentAvatar, newCommentText.trim());
      setNewCommentText('');
      loadComments();
    } catch (err) {
      console.error("فشل إضافة التعليق:", err);
    }
  };

  const handleAddReply = async (commentId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = replyTexts[commentId];
    if (!text || !text.trim()) return;
    try {
      await addReply(commentId, currentStudentName, currentStudentAvatar, text.trim());
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      setActiveReplyId(null);
      loadComments();
    } catch (err) {
      console.error("فشل إضافة الرد:", err);
    }
  };

  const formatTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} د`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} س`;
    return new Date(timestamp).toLocaleDateString('ar-EG');
  };

  return (
    <div className="canvas-modal-overlay">
      <div className="canvas-modal-container">
        
        {/* Header */}
        <div className="canvas-modal-header">
          <button className="btn-close" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
          <h2>عرض البطاقة الرقمية والمناقشة</h2>
        </div>

        {/* Workspace */}
        <div className="canvas-modal-body">
          <div className="modal-scrollable-content" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Viewport for Card Image (Simple, no canvas) */}
            <div 
              className="card-image-display-viewport"
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                maxWidth: '650px',
                margin: '0 auto 30px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <img 
                src={imageSrc} 
                alt="بطاقة تعليمية"
                style={{
                  width: '100%',
                  display: 'block',
                  objectFit: 'contain',
                  maxHeight: '60vh',
                }}
              />
            </div>

            {/* Comments & Discussion Panel */}
            <div className="comments-panel glass-panel" style={{ width: '100%', maxWidth: '750px' }}>
              <div className="comments-header">
                <MessageSquare size={18} className="icon-purple" />
                <h3>نقاش وتعليقات الطلاب ({comments.length})</h3>
              </div>

              {/* Add main comment form */}
              <form onSubmit={handleAddComment} className="main-comment-form">
                <div className="comment-avatar-badge">{currentStudentAvatar}</div>
                <div className="input-with-button-wrap">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="اكتب تعليقاً أو سؤالاً حول هذه البطاقة للطلاب..."
                    rows={2}
                    className="comment-textarea"
                  />
                  <button type="submit" className="btn-send-comment" disabled={!newCommentText.trim()}>
                    <Send size={16} />
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="comments-list">
                {comments.length === 0 ? (
                  <p className="no-comments-text">لا توجد تعليقات بعد. كن أول من يكتب تعليقاً ويبدأ النقاش!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="comment-item animate-slide-in">
                      
                      {/* Main Comment */}
                      <div className="comment-main-card">
                        <div className="comment-author-avatar">{comment.studentAvatar}</div>
                        <div className="comment-content-area">
                          <div className="comment-metadata">
                            <span className="comment-author-name">{comment.studentName}</span>
                            <span className="comment-time">{formatTime(comment.createdAt)}</span>
                          </div>
                          <p className="comment-text-content">{comment.text}</p>
                          
                          {/* Comment Actions (e.g. Reply button) */}
                          <div className="comment-actions-row">
                            <button 
                              type="button"
                              className="btn-comment-action"
                              onClick={() => {
                                setActiveReplyId(activeReplyId === comment.id ? null : comment.id);
                                if (!replyTexts[comment.id]) {
                                  setReplyTexts(prev => ({ ...prev, [comment.id]: '' }));
                                }
                              }}
                            >
                              <CornerDownLeft size={12} />
                              <span>ردّ على هذا التعليق ({comment.replies ? comment.replies.length : 0})</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Replies List (Nested) */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="replies-list-container">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="reply-item-card">
                              <div className="reply-author-avatar">{reply.studentAvatar}</div>
                              <div className="reply-content-area">
                                <div className="reply-metadata">
                                  <span className="reply-author-name">{reply.studentName}</span>
                                  <span className="reply-time">{formatTime(reply.createdAt)}</span>
                                </div>
                                <p className="reply-text-content">{reply.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input Form (Conditional) */}
                      {activeReplyId === comment.id && (
                        <form 
                          onSubmit={(e) => handleAddReply(comment.id, e)} 
                          className="reply-input-form animate-slide-in"
                        >
                          <div className="reply-avatar-badge">{currentStudentAvatar}</div>
                          <div className="input-with-button-wrap">
                            <input
                              type="text"
                              value={replyTexts[comment.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReplyTexts(prev => ({ ...prev, [comment.id]: val }));
                              }}
                              placeholder={`اكتب رداً على تعليق ${comment.studentName}...`}
                              className="reply-text-input"
                              required
                              autoFocus
                            />
                            <button 
                              type="submit" 
                              className="btn-send-reply" 
                              disabled={!(replyTexts[comment.id] || '').trim()}
                            >
                              <CornerDownLeft size={14} />
                            </button>
                          </div>
                        </form>
                      )}

                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

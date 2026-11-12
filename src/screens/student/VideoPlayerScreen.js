import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenCapture from 'expo-screen-capture';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  getLessonDetailsApi,
  getLessonCommentsApi,
  addLessonCommentApi,
  deleteLessonCommentApi,
} from '../../api/lessonsApi';
import { getCourseVideoStreamingApi } from '../../api/coursesApi';
import { getServerUrl } from '../../api/client';
import DynamicWatermark from '../../components/DynamicWatermark';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoPlayerScreen({ route, navigation }) {
  const { lessonId, courseId, videoId, title } = route.params;
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  // Comments State
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Initialize expo-video player
  const player = useVideoPlayer(streamUrl || '', (p) => {
    p.loop = false;
    if (streamUrl) {
      p.play();
    }
  });

  // Track player status updates
  useEffect(() => {
    if (!player) return;
    const subscription = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
    return () => {
      if (subscription && subscription.remove) subscription.remove();
    };
  }, [player]);

  // When streamUrl loads from API, load into player
  useEffect(() => {
    if (streamUrl && player) {
      try {
        player.replace(streamUrl);
        player.play();
      } catch (e) {
        console.warn('Player replace error:', e);
      }
    }
  }, [streamUrl, player]);

  // 1. Activate Anti-Recording & Anti-Screenshot Protection
  useEffect(() => {
    async function enableProtection() {
      try {
        if (ScreenCapture.preventScreenCaptureAsync) {
          await ScreenCapture.preventScreenCaptureAsync();
          console.log('🔒 Anti-record / FLAG_SECURE activated');
        }
      } catch (e) {
        console.warn('ScreenCapture protection error:', e);
      }
    }

    enableProtection();

    let subscription = null;
    if (ScreenCapture.addScreenshotListener) {
      subscription = ScreenCapture.addScreenshotListener(() => {
        Alert.alert('تحذير أمني', 'تم رصد محاولة التقاط شاشة. هذه الحصة محمية بموجب حقوق مستر بولا.');
      });
    }

    return () => {
      if (ScreenCapture.allowScreenCaptureAsync) {
        ScreenCapture.allowScreenCaptureAsync();
      }
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, []);

  // 2. Fetch Lesson or Course Video Details and HLS Streaming URL
  useEffect(() => {
    async function loadVideo() {
      setLoading(true);
      try {
        let res;
        if (courseId && videoId) {
          res = await getCourseVideoStreamingApi(courseId, videoId);
        } else if (lessonId) {
          res = await getLessonDetailsApi(lessonId);
        }

        if (res && res.success && res.lesson) {
          setLessonData(res.lesson);

          const base = await getServerUrl();
          if (res.lesson.video_url) {
            const fullUrl = res.lesson.video_url.startsWith('http')
              ? res.lesson.video_url
              : `${base}${res.lesson.video_url}`;
            setStreamUrl(fullUrl);
          }
        }
      } catch (err) {
        Alert.alert(
          'تنبيه',
          err.message || 'تعذر تشغيل هذا الفيديو. قد يتطلب تأكيد البريد الإلكتروني.',
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    }

    loadVideo();
  }, [lessonId, courseId, videoId]);

  // Load comments & server URL
  useEffect(() => {
    getServerUrl().then(setServerUrl);
    if (lessonId) {
      loadComments();
    } else {
      setLoadingComments(false);
    }
  }, [lessonId]);

  async function loadComments() {
    setLoadingComments(true);
    try {
      const res = await getLessonCommentsApi(lessonId);
      if (res.success && res.comments) {
        setComments(res.comments);
      }
    } catch (e) {
      console.warn('Error loading comments:', e);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await addLessonCommentApi(lessonId, commentText.trim());
      if (res.success && res.comment) {
        setComments(prev => [res.comment, ...prev]);
        setCommentText('');
      } else {
        throw new Error(res.message || 'فشل إرسال التعليق');
      }
    } catch (err) {
      Alert.alert('فشل التعليق', err.message || 'حدث خطأ أثناء إرسال التعليق');
    } finally {
      setSubmittingComment(false);
    }
  }

  function confirmDeleteComment(commentId) {
    Alert.alert('حذف التعليق', 'هل أنت متأكد من رغبتك في حذف هذا التعليق؟', [
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await deleteLessonCommentApi(lessonId, commentId);
            if (res.success) {
              setComments(prev => prev.filter(c => c.id !== commentId));
            }
          } catch (e) {
            Alert.alert('خطأ', 'فشل حذف التعليق');
          }
        }
      },
      { text: 'إلغاء', style: 'cancel' }
    ]);
  }

  function formatCommentDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 60000);

      if (diffMinutes < 1) return 'الآن';
      if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `منذ ${diffDays} يوم`;

      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  // Player controls
  function togglePlayPause() {
    if (!player) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  function seekRelative(seconds) {
    if (!player) return;
    try {
      player.currentTime = Math.max(0, player.currentTime + seconds);
    } catch (e) {}
  }

  function cyclePlaybackSpeed() {
    if (!player) return;
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    try {
      player.playbackRate = nextSpeed;
    } catch (e) {}
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {lessonData?.title || title || 'مشغل المحاضرات'}
        </Text>
      </View>

      {/* Video Container with Anti-Piracy Watermark Overlay */}
      <View style={styles.playerContainer}>
        {loading ? (
          <View style={styles.playerLoading}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={styles.loadingText}>جاري تجهيز البث الآمن (HLS)...</Text>
          </View>
        ) : streamUrl ? (
          <>
            <VideoView
              style={styles.videoPlayer}
              player={player}
              allowsFullscreen
              allowsPictureInPicture={false}
              startsPictureInPictureAutomatically={false}
            />

            {/* Dynamic Moving Watermark Overlay */}
            <DynamicWatermark
              studentName={user?.name}
              studentPhone={user?.phone}
              studentId={user?.id}
            />
          </>
        ) : (
          <View style={styles.noVideoBox}>
            <Ionicons name="alert-circle-outline" size={44} color={colors.warning} />
            <Text style={styles.noVideoText}>لم يتم رفع فيديو لهذه الحصة بعد أو لا يزال قيد المعالجة.</Text>
          </View>
        )}
      </View>

      {/* Quick Player Bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity style={styles.speedBtn} onPress={cyclePlaybackSpeed}>
          <Text style={styles.speedBtnText}>{playbackSpeed}x</Text>
        </TouchableOpacity>

        <View style={styles.centerControls}>
          <TouchableOpacity style={styles.seekBtn} onPress={() => seekRelative(-10)}>
            <Ionicons name="play-back" size={20} color={colors.textPrimary} />
            <Text style={styles.seekText}>10s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.seekBtn} onPress={() => seekRelative(10)}>
            <Ionicons name="play-forward" size={20} color={colors.textPrimary} />
            <Text style={styles.seekText}>10s</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={14} color={colors.success} />
          <Text style={styles.securityBadgeText}>محمي</Text>
        </View>
      </View>

      {/* Lesson Details & Description */}
      <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent}>
        <View style={styles.titleCard}>
          <Text style={styles.lessonHeading}>{lessonData?.title || title}</Text>
          <View style={styles.teacherRow}>
            <Ionicons name="person-circle-outline" size={20} color={colors.primaryLight} />
            <Text style={styles.teacherName}>شرح: مستر بولا • معلم الفيزياء للثانوية العامة</Text>
          </View>
        </View>

        {lessonData?.description ? (
          <View style={styles.descCard}>
            <Text style={styles.descHeading}>محتوى ونقاط الحصة:</Text>
            <Text style={styles.descBody}>{lessonData.description}</Text>
          </View>
        ) : null}

        {/* Comments Section */}
        <View style={styles.commentsCard}>
          <View style={styles.commentsHeaderRow}>
            <View style={styles.commentCountBadge}>
              <Text style={styles.commentCountText}>{comments.length}</Text>
            </View>
            <View style={styles.commentsTitleWrap}>
              <Text style={styles.commentsSectionTitle}>أسئلة واستفسارات الحصة</Text>
              <Ionicons name="chatbubbles" size={20} color={colors.accent} />
            </View>
          </View>

          {/* Add Comment Input Bar */}
          <View style={styles.commentInputRow}>
            <TouchableOpacity
              style={[
                styles.sendCommentBtn,
                (!commentText.trim() || submittingComment) && styles.sendCommentBtnDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!commentText.trim() || submittingComment}
              activeOpacity={0.8}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={16} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />
              )}
            </TouchableOpacity>

            <View style={styles.commentTextInputWrap}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="اطرح سؤالك أو ملاحظتك لمستر بولا..."
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={1000}
                textAlign="right"
              />
            </View>
          </View>

          {/* Comments List */}
          {loadingComments ? (
            <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: 20 }} />
          ) : comments.length === 0 ? (
            <View style={styles.emptyCommentsWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyCommentsTitle}>لا توجد تعليقات بعد</Text>
              <Text style={styles.emptyCommentsSubtitle}>
                كن أول من يطرح سؤالاً أو استفساراً حول هذه الحصة لمستر بولا!
              </Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((item) => (
                <View key={item.id} style={styles.commentBubble}>
                  <View style={styles.commentBubbleHeader}>
                    {(item.user_id === user?.id || isAdmin) ? (
                      <TouchableOpacity
                        onPress={() => confirmDeleteComment(item.id)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.danger} />
                      </TouchableOpacity>
                    ) : <View style={{ width: 16 }} />}

                    <View style={styles.commentUserGroup}>
                      <View style={styles.commentUserInfoCol}>
                        <View style={styles.authorBadgeRow}>
                          <Text style={styles.commentAuthorName}>{item.user_name}</Text>
                          {item.user_role === 'admin' ? (
                            <View style={styles.adminRoleTag}>
                              <Text style={styles.adminRoleTagText}>👑 مستر بولا</Text>
                            </View>
                          ) : (
                            <View style={styles.studentRoleTag}>
                              <Text style={styles.studentRoleTagText}>طالب</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.commentTimestamp}>
                          {formatCommentDate(item.created_at)}
                        </Text>
                      </View>

                      {/* Avatar */}
                      <View style={styles.commentAvatarCircle}>
                        {item.user_avatar ? (
                          <Image
                            source={{
                              uri: item.user_avatar.startsWith('http')
                                ? item.user_avatar
                                : `${serverUrl}${item.user_avatar}`,
                            }}
                            style={styles.commentAvatarPhoto}
                          />
                        ) : (
                          <View
                            style={[
                              styles.commentAvatarInitialBox,
                              item.user_role === 'admin' && styles.commentAvatarAdminBox,
                            ]}
                          >
                            <Text style={styles.commentInitialText}>
                              {(item.user_name || 'ط')[0]}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.commentTextContent}>{item.comment_text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Anti-Piracy Warning Notice */}
        <View style={styles.antiPiracyNotice}>
          <Ionicons name="lock-closed" size={18} color={colors.primaryLight} />
          <Text style={styles.antiPiracyText}>
            هذا المحتوى محمي بحقوق الملكية الفكرية. يُمنع تسجيل الشاشة أو إعادة تداول الحصة. الحساب مراقب بعلامة مائية ديناميكية ومربوط بجهازك فقط.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  playerContainer: {
    width: SCREEN_WIDTH,
    height: (SCREEN_WIDTH * 9) / 16, // 16:9 Aspect Ratio
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  playerLoading: {
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  noVideoBox: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  noVideoText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  controlsBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  speedBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  speedBtnText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: 'bold',
  },
  centerControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
  },
  seekBtn: {
    alignItems: 'center',
    padding: 4,
  },
  seekText: {
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  securityBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailsScroll: {
    flex: 1,
  },
  detailsContent: {
    padding: 16,
  },
  titleCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
  },
  lessonHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  teacherRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  teacherName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  descCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
  },
  descHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primaryLight,
    textAlign: 'right',
    marginBottom: 8,
  },
  descBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'right',
  },
  antiPiracyNotice: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  antiPiracyText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'right',
  },
  // Comments Section Styles
  commentsCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  commentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  commentsTitleWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  commentsSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  commentCountBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  commentCountText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  commentTextInputWrap: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 46,
    maxHeight: 100,
    justifyContent: 'center',
  },
  commentTextInput: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    padding: 0,
    margin: 0,
  },
  sendCommentBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  sendCommentBtnDisabled: {
    opacity: 0.45,
    backgroundColor: colors.surfaceLight,
  },
  emptyCommentsWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyCommentsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyCommentsSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  commentsList: {
    gap: 10,
  },
  commentBubble: {
    backgroundColor: colors.surfaceLight,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  commentBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  commentUserGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  commentAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  commentAvatarPhoto: {
    width: '100%',
    height: '100%',
  },
  commentAvatarInitialBox: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(2, 132, 199, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarAdminBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  commentInitialText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentUserInfoCol: {
    alignItems: 'flex-end',
  },
  authorBadgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  adminRoleTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  adminRoleTagText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: 'bold',
  },
  studentRoleTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  studentRoleTagText: {
    color: colors.primaryLight,
    fontSize: 10,
  },
  commentTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  commentTextContent: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
});

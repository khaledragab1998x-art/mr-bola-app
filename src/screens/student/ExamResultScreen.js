import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function ExamResultScreen({ route, navigation }) {
  const { title, score, totalMarks, percentage, passed } = route.params;

  const finalPercentage = percentage !== undefined ? percentage : Math.round((score / totalMarks) * 100);
  const isPassed = passed !== undefined ? passed : finalPercentage >= 50;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, isPassed ? styles.passCircle : styles.failCircle]}>
          <Ionicons
            name={isPassed ? 'trophy' : 'alert-circle'}
            size={50}
            color={isPassed ? colors.accent : colors.danger}
          />
        </View>

        <Text style={styles.examTitle}>{title}</Text>
        <Text style={styles.resultHeading}>
          {isPassed ? 'أحسنت يا بطل! تم اجتياز الامتحان بنجاح 🎉' : 'فرصة للمراجعة والتحسين! 💪'}
        </Text>

        {/* Score Board */}
        <View style={styles.scoreBox}>
          <Text style={styles.percentageText}>{finalPercentage}%</Text>
          <Text style={styles.scoreSubText}>
            الدرجة المحققة: {score} من أصل {totalMarks}
          </Text>
        </View>

        {/* Teacher Note */}
        <View style={styles.teacherFeedback}>
          <Text style={styles.feedbackTitle}>رسالة مستر بولا لك:</Text>
          <Text style={styles.feedbackBody}>
            {isPassed
              ? 'مستوى ممتاز وتركيز رائع في استنتاج القوانين. واصل التدريب على المسائل الصعبة للوصول للدرجة النهائية في الفيزياء.'
              : 'الفيزياء تحتاج تدريباً مستمراً وصبراً. راجع الحصة الخاصة بهذا الباب وركّز على القوانين والملاحظات ثم أعد المحاولة.'}
          </Text>
        </View>

        {/* Home Button */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>العودة للرئيسية</Text>
          <Ionicons name="home-outline" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  passCircle: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderColor: colors.accent,
  },
  failCircle: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: colors.danger,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  resultHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 20,
  },
  percentageText: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.primaryLight,
  },
  scoreSubText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  teacherFeedback: {
    width: '100%',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 24,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primaryLight,
    textAlign: 'right',
    marginBottom: 6,
  },
  feedbackBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'right',
  },
  doneBtn: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

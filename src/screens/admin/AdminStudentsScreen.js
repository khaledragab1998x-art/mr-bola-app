import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getStudentsListApi, resetStudentDeviceApi, toggleStudentBlockApi } from '../../api/adminApi';

export default function AdminStudentsScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents(query = '') {
    setLoading(true);
    try {
      const res = await getStudentsListApi(query);
      if (res.success && res.data) {
        setStudents(res.data);
      }
    } catch (e) {
      console.warn('Students load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleSearch(text) {
    setSearch(text);
    loadStudents(text);
  }

  async function handleResetDevice(student) {
    Alert.alert(
      'Unlink Device',
      `Do you want to reset the bound device for student "${student.name}"?\nThe student will be allowed to sign in from a new phone.`,
      [
        {
          text: 'Unlink Device Now',
          onPress: async () => {
            try {
              const res = await resetStudentDeviceApi(student.id);
              if (res.success) {
                Alert.alert('Success', res.message || 'Device unlinked successfully');
                loadStudents(search);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to unlink device');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function handleToggleBlock(student) {
    const actionText = student.is_blocked ? 'Unblock' : 'Block';
    Alert.alert(
      `${actionText} Account`,
      `Are you sure you want to ${actionText.toLowerCase()} the account for "${student.name}"?`,
      [
        {
          text: actionText,
          style: student.is_blocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const res = await toggleStudentBlockApi(student.id);
              if (res.success) {
                Alert.alert('Success', res.message || `Student account ${actionText.toLowerCase()}ed`);
                loadStudents(search);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to update account status');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Students & Devices ({students.length})</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or phone number..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearch}
          textAlign="left"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : students.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No matching students found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadStudents(search);
              }}
              tintColor={colors.primaryLight}
            />
          }
        >
          {students.map((student) => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentTopRow}>
                <View style={styles.studentNameWrap}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentEmail}>{student.email}</Text>
                  <Text style={styles.studentPhone}>{student.phone}</Text>
                </View>

                <View style={styles.badgesCol}>
                  <View
                    style={[
                      styles.badge,
                      student.is_email_verified ? styles.verifiedBadge : styles.unverifiedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: student.is_email_verified ? colors.success : colors.warning },
                      ]}
                    >
                      {student.is_email_verified ? 'Verified' : 'Unverified'}
                    </Text>
                  </View>

                  {student.is_blocked ? (
                    <View style={[styles.badge, styles.blockedBadge]}>
                      <Text style={[styles.badgeText, { color: colors.danger }]}>Blocked</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Device ID Info */}
              <View style={styles.deviceRow}>
                <Ionicons
                  name={student.device_id ? 'phone-portrait' : 'phone-portrait-outline'}
                  size={16}
                  color={student.device_id ? colors.accent : colors.textMuted}
                />
                <Text style={styles.deviceText}>
                  {student.device_id
                    ? `Device: ${student.device_id.substring(0, 18)}...`
                    : 'No device bound yet'}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.cardActions}>
                {student.device_id ? (
                  <TouchableOpacity
                    style={styles.resetDeviceBtn}
                    onPress={() => handleResetDevice(student)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-circle-outline" size={16} color={colors.primaryLight} />
                    <Text style={styles.resetDeviceText}>Unlink Device</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.blockBtn, student.is_blocked && styles.unblockBtn]}
                  onPress={() => handleToggleBlock(student)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={student.is_blocked ? 'lock-open-outline' : 'ban-outline'}
                    size={16}
                    color={student.is_blocked ? colors.success : colors.danger}
                  />
                  <Text style={[styles.blockText, student.is_blocked && { color: colors.success }]}>
                    {student.is_blocked ? 'Unblock Student' : 'Block Student'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'left',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 30,
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
  },
  studentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentNameWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  studentEmail: {
    fontSize: 12,
    color: colors.primaryLight,
    marginTop: 2,
  },
  studentPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  blockedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  deviceText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  resetDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  resetDeviceText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  unblockBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  blockText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
});

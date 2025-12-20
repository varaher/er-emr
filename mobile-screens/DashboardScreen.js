// DashboardScreen.js - New home screen with today's patients
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [todayCases, setTodayCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    pending: 0,
    discharged: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("user");

      if (!token) {
        navigation.replace("Login");
        return;
      }

      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Fetch cases
      const res = await fetch(`${API_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch cases");

      const allCases = await res.json();

      // Filter today's cases
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaysCases = allCases.filter((c) => {
        const caseDate = new Date(c.created_at);
        caseDate.setHours(0, 0, 0, 0);
        return caseDate.getTime() === today.getTime();
      });

      // Sort by most recent first
      todaysCases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setTodayCases(todaysCases);

      // Calculate stats
      const critical = todaysCases.filter((c) => c.triage_priority === 1 || c.triage_priority === 2).length;
      const pending = todaysCases.filter((c) => c.status !== "completed" && c.status !== "discharged").length;
      const discharged = todaysCases.filter((c) => c.status === "completed" || c.status === "discharged").length;

      setStats({
        total: todaysCases.length,
        critical,
        pending,
        discharged,
      });
    } catch (err) {
      console.error("Load data error:", err);
      Alert.alert("Error", "Failed to load data");
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          navigation.replace("Login");
        },
      },
    ]);
  };

  const startNewTriage = () => {
    navigation.navigate("Triage");
  };

  const openCase = (caseItem) => {
    navigation.navigate("CaseSheet", {
      caseId: caseItem.id,
      patientType: caseItem.case_type || "adult",
    });
  };

  const goToDischarge = (caseItem) => {
    navigation.navigate("DischargeSummary", {
      caseId: caseItem.id,
    });
  };

  const getPriorityColor = (level) => {
    switch (level) {
      case 1: return "#ef4444";
      case 2: return "#f97316";
      case 3: return "#eab308";
      case 4: return "#22c55e";
      case 5: return "#3b82f6";
      default: return "#6b7280";
    }
  };

  const getPriorityName = (level) => {
    switch (level) {
      case 1: return "RED";
      case 2: return "ORANGE";
      case 3: return "YELLOW";
      case 4: return "GREEN";
      case 5: return "BLUE";
      default: return "N/A";
    }
  };

  const getStatusBadge = (caseItem) => {
    if (caseItem.status === "completed" || caseItem.status === "discharged") {
      return { text: "Discharged", color: "#22c55e", bg: "#f0fdf4" };
    }
    if (caseItem.triage_priority === 1) {
      return { text: "CRITICAL", color: "#dc2626", bg: "#fef2f2" };
    }
    if (caseItem.triage_priority === 2) {
      return { text: "Urgent", color: "#f97316", bg: "#fff7ed" };
    }
    if (!caseItem.disposition) {
      return { text: "In Progress", color: "#3b82f6", bg: "#eff6ff" };
    }
    return { text: "Pending", color: "#eab308", bg: "#fefce8" };
  };

  const calculateTimeInER = (createdAt) => {
    const start = new Date(createdAt);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || "Doctor"}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate("Logs")}>
            <Ionicons name="list" size={22} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate("Profile")}>
            <Ionicons name="person-circle" size={28} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* New Patient Button */}
        <TouchableOpacity style={styles.newPatientBtn} onPress={startNewTriage}>
          <View style={styles.newPatientIcon}>
            <Ionicons name="add" size={28} color="#fff" />
          </View>
          <View style={styles.newPatientText}>
            <Text style={styles.newPatientTitle}>New Patient</Text>
            <Text style={styles.newPatientSubtitle}>Start triage assessment</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#2563eb" />
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: "#3b82f6" }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#ef4444" }]}>
            <Text style={[styles.statNumber, { color: "#ef4444" }]}>{stats.critical}</Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#f97316" }]}>
            <Text style={[styles.statNumber, { color: "#f97316" }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#22c55e" }]}>
            <Text style={[styles.statNumber, { color: "#22c55e" }]}>{stats.discharged}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>

        {/* Today's Patients Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Patients</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </Text>
        </View>

        {/* Patient List */}
        {todayCases.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No patients today</Text>
            <Text style={styles.emptySubtext}>Tap "New Patient" to start</Text>
          </View>
        ) : (
          todayCases.map((item) => {
            const statusBadge = getStatusBadge(item);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.patientCard}
                onPress={() => openCase(item)}
              >
                {/* Priority Bar */}
                <View
                  style={[
                    styles.priorityBar,
                    { backgroundColor: getPriorityColor(item.triage_priority) },
                  ]}
                />

                <View style={styles.cardContent}>
                  {/* Top Row: Name & Status */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>
                        {item.patient?.name || "Unknown Patient"}
                      </Text>
                      <Text style={styles.patientMeta}>
                        {item.patient?.age || "?"} • {item.patient?.sex || "?"} •{" "}
                        {item.case_type === "pediatric" ? "Pedia" : "Adult"}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                      <Text style={[styles.statusText, { color: statusBadge.color }]}>
                        {statusBadge.text}
                      </Text>
                    </View>
                  </View>

                  {/* Complaint */}
                  <Text style={styles.complaint} numberOfLines={1}>
                    {item.presenting_complaint?.text || "No complaint"}
                  </Text>

                  {/* Bottom Row: Priority, Time, Actions */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.metaInfo}>
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: getPriorityColor(item.triage_priority) },
                        ]}
                      >
                        <Text style={styles.priorityText}>
                          {getPriorityName(item.triage_priority)}
                        </Text>
                      </View>
                      <View style={styles.timeInfo}>
                        <Ionicons name="time-outline" size={14} color="#94a3b8" />
                        <Text style={styles.timeText}>
                          {formatTime(item.created_at)} • {calculateTimeInER(item.created_at)}
                        </Text>
                      </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openCase(item)}
                      >
                        <Ionicons name="document-text" size={18} color="#3b82f6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => goToDischarge(item)}
                      >
                        <Ionicons name="exit" size={18} color="#16a34a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* View All Logs Button */}
        {todayCases.length > 0 && (
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => navigation.navigate("Logs")}
          >
            <Text style={styles.viewAllText}>View All Case Logs</Text>
            <Ionicons name="arrow-forward" size={18} color="#2563eb" />
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  greeting: {
    fontSize: 14,
    color: "#64748b",
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  newPatientBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2563eb",
    gap: 12,
  },
  newPatientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  newPatientText: {
    flex: 1,
  },
  newPatientTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  newPatientSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  dateText: {
    fontSize: 13,
    color: "#64748b",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#cbd5e1",
    marginTop: 4,
  },
  patientCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  priorityBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  patientMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  complaint: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 8,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
  },
});
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load user and cases when screen focuses
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

      // Fetch recent cases
      await fetchRecentCases(token);
    } catch (err) {
      console.error("Load data error:", err);
    }
    setLoading(false);
  };

  const fetchRecentCases = async (token) => {
    try {
      const res = await fetch(`${API_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch cases");

      const data = await res.json();

      // Sort by created_at descending and take last 24 hours for institutional
      const now = new Date();
      const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

      let filteredCases = data;

      // For institutional users, show all cases from last 24 hours
      // For individual users, show their own cases
      if (user?.user_type === "institutional" && user?.hospital_id) {
        filteredCases = data.filter((c) => {
          const createdAt = new Date(c.created_at);
          return createdAt >= twentyFourHoursAgo;
        });
      }

      // Sort by most recent first
      filteredCases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setRecentCases(filteredCases.slice(0, 20)); // Show last 20 cases
    } catch (err) {
      console.error("Fetch cases error:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const token = await AsyncStorage.getItem("token");
    await fetchRecentCases(token);
    setRefreshing(false);
  };

  const openCase = (caseItem) => {
    navigation.navigate("CaseSheet", {
      caseId: caseItem.id,
      patientType: caseItem.case_type || "adult",
    });
  };

  const getPriorityColor = (level) => {
    switch (level) {
      case 1: return "#ef4444"; // RED
      case 2: return "#f97316"; // ORANGE
      case 3: return "#eab308"; // YELLOW
      case 4: return "#22c55e"; // GREEN
      case 5: return "#3b82f6"; // BLUE
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

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>Dr. {user?.name || "User"}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={24} color="#007AFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Institutional Badge */}
      {user?.user_type === "institutional" && (
        <View style={styles.institutionalBadge}>
          <Ionicons name="business" size={16} color="#0369a1" />
          <Text style={styles.institutionalText}>
            {user?.hospital_name || "Institution"} • Shared Dashboard (24h)
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#fee2e2" }]}
          onPress={() => navigation.navigate("Triage")}
        >
          <Ionicons name="pulse" size={32} color="#dc2626" />
          <Text style={styles.actionTitle}>🚑 New Triage</Text>
          <Text style={styles.actionSubtitle}>Start patient assessment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#dbeafe" }]}
          onPress={() => navigation.navigate("CaseSheet", { patientType: "adult" })}
        >
          <Ionicons name="document-text" size={32} color="#2563eb" />
          <Text style={styles.actionTitle}>📄 New Case</Text>
          <Text style={styles.actionSubtitle}>Direct case entry</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#fef3c7" }]}
          onPress={() => navigation.navigate("CaseSheet", { patientType: "pediatric" })}
        >
          <Ionicons name="happy" size={32} color="#d97706" />
          <Text style={styles.actionTitle}>👶 Pediatric</Text>
          <Text style={styles.actionSubtitle}>Child case sheet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: "#d1fae5" }]}
          onPress={() => navigation.navigate("Logs")}
        >
          <Ionicons name="list" size={32} color="#059669" />
          <Text style={styles.actionTitle}>📝 All Cases</Text>
          <Text style={styles.actionSubtitle}>View history</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Patients */}
      <View style={styles.recentHeader}>
        <Text style={styles.sectionTitle}>Recent Patients</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Logs")}>
          <Text style={styles.seeAll}>See All →</Text>
        </TouchableOpacity>
      </View>

      {recentCases.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No cases yet</Text>
          <Text style={styles.emptySubtext}>Start a new triage to see patients here</Text>
        </View>
      ) : (
        recentCases.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.patientCard}
            onPress={() => openCase(item)}
          >
            <View style={styles.patientLeft}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor(item.triage_priority) },
                ]}
              />
              <View>
                <Text style={styles.patientName}>
                  {item.patient?.name || "Unknown Patient"}
                </Text>
                <Text style={styles.patientInfo}>
                  {item.patient?.age || "?"} {item.patient?.sex?.[0] || ""} •{" "}
                  {item.presenting_complaint?.text?.substring(0, 30) || "No complaint"}
                  {item.presenting_complaint?.text?.length > 30 ? "..." : ""}
                </Text>
                <Text style={styles.patientMeta}>
                  {item.case_type === "pediatric" ? "👶 Pediatric" : "🏥 Adult"} •{" "}
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
            <View style={styles.patientRight}>
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
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{recentCases.length}</Text>
          <Text style={styles.statLabel}>Total Cases</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {recentCases.filter((c) => c.triage_priority === 1 || c.triage_priority === 2).length}
          </Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {recentCases.filter((c) => c.status === "completed" || c.status === "discharged").length}
          </Text>
          <Text style={styles.statLabel}>Discharged</Text>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
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
    padding: 20,
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
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  institutionalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  institutionalText: {
    color: "#0369a1",
    fontWeight: "600",
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
  },
  seeAll: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  patientLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  patientInfo: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  patientMeta: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  patientRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
});

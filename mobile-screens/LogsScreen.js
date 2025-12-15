import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = "https://er-emr-backend.onrender.com/api";

export default function LogsScreen({ navigation }) {
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [user, setUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadCases();
    }, [])
  );

  const loadCases = async () => {
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

      const res = await fetch(`${API_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch cases");

      const data = await res.json();

      // Sort by most recent first
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setCases(data);
      setFilteredCases(data);
    } catch (err) {
      console.error("Load cases error:", err);
      Alert.alert("Error", "Failed to load cases");
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCases();
    setRefreshing(false);
  };

  // Filter cases based on search and priority
  useEffect(() => {
    let result = cases;

    // Filter by priority
    if (filterPriority !== "all") {
      const priorityMap = { red: 1, orange: 2, yellow: 3, green: 4, blue: 5 };
      result = result.filter((c) => c.triage_priority === priorityMap[filterPriority]);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.patient?.name?.toLowerCase().includes(query) ||
          c.patient?.uhid?.toLowerCase().includes(query) ||
          c.presenting_complaint?.text?.toLowerCase().includes(query)
      );
    }

    setFilteredCases(result);
  }, [searchQuery, filterPriority, cases]);

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

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading cases...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Case Logs</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Institutional Badge */}
      {user?.user_type === "institutional" && (
        <View style={styles.institutionalBadge}>
          <Ionicons name="business" size={16} color="#0369a1" />
          <Text style={styles.institutionalText}>
            Showing all cases from {user?.hospital_name || "your institution"}
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, UHID, or complaint..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Priority Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {["all", "red", "orange", "yellow", "green", "blue"].map((priority) => (
          <TouchableOpacity
            key={priority}
            style={[
              styles.filterChip,
              filterPriority === priority && styles.filterChipActive,
              priority !== "all" && { borderColor: getPriorityColor(["red", "orange", "yellow", "green", "blue"].indexOf(priority) + 1) },
            ]}
            onPress={() => setFilterPriority(priority)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterPriority === priority && styles.filterChipTextActive,
              ]}
            >
              {priority === "all" ? "All" : priority.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Showing {filteredCases.length} of {cases.length} cases
        </Text>
      </View>

      {/* Cases List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredCases.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No cases found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        ) : (
          filteredCases.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.caseCard}
              onPress={() => openCase(item)}
            >
              <View style={styles.caseHeader}>
                <View style={styles.caseLeft}>
                  <View
                    style={[
                      styles.priorityBar,
                      { backgroundColor: getPriorityColor(item.triage_priority) },
                    ]}
                  />
                  <View style={styles.caseInfo}>
                    <Text style={styles.patientName}>
                      {item.patient?.name || "Unknown Patient"}
                    </Text>
                    <Text style={styles.patientDetails}>
                      {item.patient?.age || "?"} • {item.patient?.sex || "?"} •{" "}
                      {item.patient?.uhid || "No UHID"}
                    </Text>
                  </View>
                </View>
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
              </View>

              <View style={styles.caseBody}>
                <Text style={styles.complaintLabel}>Chief Complaint:</Text>
                <Text style={styles.complaintText} numberOfLines={2}>
                  {item.presenting_complaint?.text || "No complaint recorded"}
                </Text>
              </View>

              <View style={styles.caseFooter}>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color="#94a3b8" />
                  <Text style={styles.metaText}>{formatDateTime(item.created_at)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons
                    name={item.case_type === "pediatric" ? "happy-outline" : "person-outline"}
                    size={14}
                    color="#94a3b8"
                  />
                  <Text style={styles.metaText}>
                    {item.case_type === "pediatric" ? "Pediatric" : "Adult"}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          item.status === "completed" || item.status === "discharged"
                            ? "#22c55e"
                            : "#f59e0b",
                      },
                    ]}
                  />
                  <Text style={styles.metaText}>
                    {item.status === "completed" || item.status === "discharged"
                      ? "Completed"
                      : "In Progress"}
                  </Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => openCase(item)}
                >
                  <Ionicons name="document-text-outline" size={16} color="#007AFF" />
                  <Text style={styles.quickBtnText}>View Case</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => goToDischarge(item)}
                >
                  <Ionicons name="exit-outline" size={16} color="#16a34a" />
                  <Text style={[styles.quickBtnText, { color: "#16a34a" }]}>Discharge</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 30 }} />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#1e293b",
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#1e293b",
    borderColor: "#1e293b",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
  caseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  caseLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  priorityBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  caseInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  patientDetails: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
  },
  caseBody: {
    padding: 12,
  },
  complaintLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 4,
  },
  complaintText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  caseFooter: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
});

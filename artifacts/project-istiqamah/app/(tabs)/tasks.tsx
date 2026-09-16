import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SubtaskInput, Task, useTasks } from "@/context/task-context";
import { isValidTime } from "@/lib/time";
import { useColors } from "@/hooks/useColors";

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, addTask, updateTask, deleteTask, preferences } = useTasks();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [actionItems, setActionItems] = useState<SubtaskInput[]>([]);
  const [formError, setFormError] = useState("");

  const openNew = () => {
    setEditing(null);
    setName("");
    setStartTime("");
    setEndTime("");
    setDescription("");
    setActionItems([]);
    setFormError("");
    setModalVisible(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setName(task.name);
    setStartTime(task.startTime);
    setEndTime(task.endTime);
    setDescription(task.description);
    setActionItems(
      task.subtasks.map((subtask) => ({ id: subtask.id, name: subtask.name })),
    );
    setFormError("");
    setModalVisible(true);
  };

  const save = () => {
    if (!name.trim() || !isValidTime(startTime) || !isValidTime(endTime)) {
      setFormError(
        "Add a name plus valid times in HH:MM format, for example 05:00.",
      );
      return;
    }
    const subtasks = actionItems
      .map((item) => ({ ...item, name: item.name.trim() }))
      .filter((item) => item.name)
      .slice(0, 5);
    if (editing)
      updateTask(editing.id, name, startTime, endTime, description, subtasks);
    else addTask(name, startTime, endTime, description, subtasks);
    if (preferences.haptics)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
    setModalVisible(false);
  };

  const remove = (task: Task) =>
    Alert.alert("Remove block?", `Delete ${task.name} and its action list?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteTask(task.id),
      },
    ]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        contentInsetAdjustmentBehavior="never"
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 22, paddingBottom: 92 },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
              YOUR SYSTEM
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Blocks
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Give your intentions a start and a finish.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Add block"
            testID="new-task"
            onPress={openNew}
            style={({ pressed }) => [
              styles.addIcon,
              { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="plus" size={21} color={colors.primaryForeground} />
          </Pressable>
        </View>
        <View
          style={[
            styles.summary,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.summaryNumber, { color: colors.foreground }]}>
            {tasks.length}
          </Text>
          <View>
            <Text
              style={[styles.summaryLabel, { color: colors.mutedForeground }]}
            >
              TIME BLOCKS
            </Text>
            <Text style={[styles.summaryCopy, { color: colors.foreground }]}>
              Each one has a beginning.
            </Text>
          </View>
        </View>
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>
            ALL BLOCKS
          </Text>
          <Text style={[styles.listCount, { color: colors.mutedForeground }]}>
            5 ACTIONS MAX
          </Text>
        </View>
        <View
          style={[
            styles.list,
            { backgroundColor: colors.deepCard, borderColor: colors.border },
          ]}
        >
          {tasks.map((task, index) => (
            <Pressable
              key={task.id}
              onPress={() => openEdit(task)}
              testID={`edit-${task.id}`}
              style={({ pressed }) => [
                styles.task,
                {
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.72 : 1,
                },
                index === tasks.length - 1 && styles.lastTask,
              ]}
            >
              <View
                style={[styles.taskMark, { backgroundColor: colors.accent }]}
              >
                <Feather name="clock" size={15} color={colors.primary} />
              </View>
              <View style={styles.taskCopy}>
                <Text style={[styles.taskName, { color: colors.foreground }]}>
                  {task.name}
                </Text>
                <Text
                  style={[
                    styles.taskDescription,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {task.subtasks.length
                    ? `${task.subtasks.length} action${task.subtasks.length === 1 ? "" : "s"} · `
                    : ""}
                  {task.description}
                </Text>
              </View>
              <View style={styles.taskMeta}>
                <Text style={[styles.taskTime, { color: colors.foreground }]}>
                  {task.startTime}
                </Text>
                <Text
                  style={[styles.taskEnd, { color: colors.mutedForeground }]}
                >
                  to {task.endTime}
                </Text>
                <View style={styles.editHint}>
                  <Feather
                    name="edit-3"
                    size={12}
                    color={colors.mutedForeground}
                  />
                </View>
              </View>
            </Pressable>
          ))}
          {!tasks.length && (
            <View style={styles.empty}>
              <Feather
                name="plus-circle"
                size={24}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Your system is empty
              </Text>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Add one block to get started.
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          Tap a block to edit its timing and action checklist.
        </Text>
      </ScrollView>
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalBackdrop,
            { backgroundColor: "rgba(0,0,0,0.72)" },
          ]}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingBottom: insets.bottom + 18,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text
                  style={[
                    styles.modalEyebrow,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {editing ? "REFINE YOUR BLOCK" : "NEW TIME BLOCK"}
                </Text>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editing ? "Edit block" : "Add a block"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                onPress={() => setModalVisible(false)}
              >
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              BLOCK NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder="Fajr Block"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.deepCard,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
            <View style={styles.timeFields}>
              <View style={styles.timeField}>
                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                >
                  START TIME
                </Text>
                <TextInput
                  value={startTime}
                  onChangeText={(value) => {
                    setStartTime(value);
                    setFormError("");
                  }}
                  placeholder="05:00"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.deepCard,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
              </View>
              <View style={styles.timeField}>
                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                >
                  END TIME
                </Text>
                <TextInput
                  value={endTime}
                  onChangeText={(value) => {
                    setEndTime(value);
                    setFormError("");
                  }}
                  placeholder="06:30"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.deepCard,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Crossing midnight is supported: 23:00 to 01:00.
            </Text>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              WHAT WILL YOU DO? · UP TO 5 ACTIONS
            </Text>
            <TextInput
              value={actionItems.map((item) => item.name).join("\n")}
              onChangeText={(value) =>
                setActionItems((current) =>
                  reconcileActionItems(current, value),
                )
              }
              placeholder={"One action per line\nPray Fajr\nRead Quran"}
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[
                styles.input,
                styles.actionArea,
                {
                  backgroundColor: colors.deepCard,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground }]}
            >
              BLOCK NOTE
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="A short reminder to return to"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.deepCard,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
            {formError ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {formError}
              </Text>
            ) : null}
            <Pressable
              testID="save-task"
              onPress={save}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor:
                    name.trim() &&
                    isValidTime(startTime) &&
                    isValidTime(endTime)
                      ? colors.primary
                      : colors.muted,
                  opacity: pressed ? 0.76 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.saveText,
                  {
                    color:
                      name.trim() &&
                      isValidTime(startTime) &&
                      isValidTime(endTime)
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                  },
                ]}
              >
                {editing ? "Save changes" : "Add time block"}
              </Text>
            </Pressable>
            {editing && (
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  remove(editing);
                }}
                style={styles.deleteButton}
              >
                <Feather name="trash-2" size={15} color={colors.destructive} />
                <Text
                  style={[styles.deleteText, { color: colors.destructive }]}
                >
                  Remove block
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function reconcileActionItems(
  current: SubtaskInput[],
  value: string,
): SubtaskInput[] {
  const names = value.split("\n").slice(0, 5);
  const used = new Set<number>();
  const exactMatches = names.map((name) => {
    const index = current.findIndex(
      (item, candidateIndex) => !used.has(candidateIndex) && item.name === name,
    );
    if (index >= 0) used.add(index);
    return index;
  });

  return names.map((name, index) => {
    const exactIndex = exactMatches[index];
    if (exactIndex >= 0) return { ...current[exactIndex], name };

    const sameIndex = !used.has(index) ? index : -1;
    const fallbackIndex = current.findIndex(
      (_item, candidateIndex) => !used.has(candidateIndex),
    );
    const previousIndex = sameIndex >= 0 ? sameIndex : fallbackIndex;
    if (previousIndex < 0) return { name };
    used.add(previousIndex);
    return { ...current[previousIndex], name };
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingHorizontal: 18 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  eyebrow: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.6,
    marginBottom: 7,
  },
  title: { fontSize: 34, fontFamily: "Inter_400Regular", letterSpacing: -1 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 5 },
  addIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 30,
  },
  summaryNumber: { fontSize: 36, fontFamily: "Inter_400Regular" },
  summaryLabel: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  summaryCopy: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 5 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listCount: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.1 },
  list: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  task: {
    minHeight: 91,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
  },
  lastTask: { borderBottomWidth: 0 },
  taskMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  taskCopy: { flex: 1, paddingRight: 8 },
  taskName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  taskDescription: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
    marginTop: 4,
  },
  taskMeta: { alignItems: "flex-end", gap: 3 },
  taskTime: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  taskEnd: { fontSize: 9, fontFamily: "Inter_400Regular" },
  editHint: { padding: 2, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 38 },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 10 },
  emptyText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 5 },
  note: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 16,
  },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modal: {
    maxHeight: "94%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 21,
  },
  modalEyebrow: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  modalTitle: { fontSize: 25, fontFamily: "Inter_600SemiBold" },
  fieldLabel: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  timeFields: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1 },
  helper: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    marginTop: -5,
    marginBottom: 14,
  },
  actionArea: {
    minHeight: 84,
    paddingTop: 13,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  errorText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
    marginTop: -5,
    marginBottom: 10,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  saveText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deleteButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 6,
  },
  deleteText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

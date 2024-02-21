import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card } from "@rneui/themed";

const TimetableScreen = () => {
  const [timetable, setTimetable] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const selectedClass = await AsyncStorage.getItem("selectedClass");
        setSelectedClass(selectedClass);
        try {
          const response = await fetch(
            "https://rozvrh-bakalari.vercel.app/api/fetch-timetable",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ class: selectedClass }),
            }
          );
          const data = await response.json();

          const selectedGroups = await AsyncStorage.getItem("groupsData");

          if (Array.isArray(data.timetable)) {
            const filteredTimetable = data.timetable.map((day) => {
              const filteredLessons = {};

              if (filteredLessons.length === 0) {
                return filteredLessons;
              } else {
                for (const [key, lessons] of Object.entries(day)) {
                  const filteredGroupLessons = lessons.filter((lesson) => {
                    const lessonGroup = lesson.group;
                    return (
                      !lessonGroup ||
                      lessonGroup === null ||
                      selectedGroups.includes(lessonGroup)
                    );
                  });

                  if (filteredGroupLessons.length > 0) {
                    filteredLessons[key] = filteredGroupLessons;
                  } else {
                    filteredLessons[key] = lessons;
                  }
                }
                return filteredLessons;
              }
            });

            setTimetable(filteredTimetable);
          } else {
            console.error("Timetable data is not an array:", data.timetable);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      } catch (error) {
        console.error("Error fetching saved class:", error);
        return;
      }
    };

    fetchData();
  }, []);

  const renderItem = ({ item }) => {
    const renderDay = (day) => {
      const lessons = item[day];

      if (!lessons || !Array.isArray(lessons)) {
        return null;
      }

      return (
        <View key={day} style={styles.gridItem}>
          <Text
            style={{
              width: "100%",
              backgroundColor: "gray",
              padding: 10,
              color: "white",
            }}
          >
            {day}
          </Text>
          {lessons.map((lesson, index) => (
            <View key={index} style={styles.lesson}>
              {lesson.type === "atom" ? (
                <>
                  <Card
                    containerStyle={[
                      styles.lessonNumber,
                      lesson.changeinfo !== "" ? styles.removedCard : null,
                    ]}
                  >
                    <Text>{lesson.lessonNumber}</Text>
                  </Card>
                  <Card
                    containerStyle={[
                      styles.lessonCard,
                      lesson.changeinfo !== "" ? styles.removedCard : null,
                    ]}
                  >
                    <View style={styles.sideToSide}>
                      <View>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "bold",
                            maxWidth: 200,
                          }}
                        >
                          {lesson.subject || "Error fetching subject."}
                        </Text>
                        <Text>
                          {lesson.teacher || "Error fetching teacher."}
                        </Text>
                        {lesson.changeinfo !== "" ? (
                          <Text>{lesson.changeinfo}</Text>
                        ) : null}
                      </View>
                      <View
                        style={{
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "flex-end",
                        }}
                      >
                        <Text>{lesson.room || "Error fetching class."}</Text>
                        <Text>
                          {lesson.lessonTime || "Error fetching time."}
                        </Text>
                        {lesson.group !== "" ? (
                          <Text style={{fontVariant: "italic"}}>{lesson.group}</Text>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </>
              ) : lesson.type === "removed" ? (
                <>
                  <Card
                    containerStyle={[styles.lessonNumber, styles.removedCard]}
                  >
                    <Text>{lesson.lessonNumber}</Text>
                  </Card>
                  <Card
                    containerStyle={[styles.lessonCard, styles.removedCard]}
                  >
                    <View style={styles.sideToSide}>
                      <View>
                        <Text style={{ fontSize: 20, fontWeight: "bold", maxWidth: 200 }}>
                          {lesson.removedInfo}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "column",
                          justifyContent: "center",
                        }}
                      >
                        <Text>
                          {lesson.lessonTime || "Error fetching time."}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </>
              ) : (
                <Card containerStyle={[styles.lessonCard, styles.absentCard]}>
                  <View style={styles.sideToSide}>
                    <Text>{lesson.absentInfo}</Text>
                  </View>
                </Card>
              )}
            </View>
          ))}
        </View>
      );
    };

    return (
      <>
        {renderDay("Pondělí")}
        {renderDay("Úterý")}
        {renderDay("Středa")}
        {renderDay("Čtvrtek")}
        {renderDay("Pátek")}
      </>
    );
  };

  if (!Array.isArray(timetable) || timetable.length === 0) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={timetable}
      renderItem={renderItem}
      keyExtractor={(item, index) => index.toString()}
      numColumns={1}
    />
  );
};

const styles = StyleSheet.create({
  gridItem: {
    flexDirection: "column",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  lesson: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 0,
    padding: 10
  },
  lessonCard: {
    borderRadius: 10,
    width: "85%",
    margin: 0,
  },
  removedCard: {
    backgroundColor: "#fa938c",
  },
  absentCard: {
    backgroundColor: "#88cc88",
  },
  lessonNumber: {
    height: "100%",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    margin: 0,
  },
  sideToSide: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default TimetableScreen;

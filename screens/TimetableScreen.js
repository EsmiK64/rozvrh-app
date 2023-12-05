import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TimetableScreen = () => {
  const [timetable, setTimetable] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const selectedClass = await AsyncStorage.getItem('selectedClass');
        console.log(selectedClass);
        setSelectedClass(selectedClass);
        try {
          console.log(selectedClass)
          const response = await fetch(
            "https://rozvrh-bakalari.vercel.app/api/fetch-timetable",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ class: selectedClass }), // Use savedClass here
            }
          );
          const data = await response.json();
          console.log('Fetched data:', data);

          const selectedGroups = await AsyncStorage.getItem('groupsData');
          console.log(selectedGroups);

          if (Array.isArray(data.timetable)) {
            const filteredTimetable = data.timetable.map((day) => {
              const filteredLessons = {};

              if (filteredLessons.length === 0) {
                return filteredLessons;
              } else {
                for (const [key, lessons] of Object.entries(day)) {
                  const filteredGroupLessons = lessons.filter((lesson) => {
                    const lessonGroup = lesson.group;
                    console.log(lesson.group);
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
            console.error('Timetable data is not an array:', data.timetable);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      } catch (error) {
        console.error('Error fetching saved class:', error);
        return; // Stop execution if there's an error fetching saved class
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
          {lessons.map((lesson, index) => (
            <View key={index}>
              <Text>{lesson.subject || 'No subject'}</Text>
              <Text>{lesson.room || 'No room'}</Text>
              <Text>{lesson.teacher || 'No teacher'}</Text>
            </View>
          ))}
        </View>
      );
    };

    return (
      <>
        {renderDay('po')}
        {renderDay('út')}
        {renderDay('st')}
        {renderDay('čt')}
        {renderDay('pá')}
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
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default TimetableScreen;
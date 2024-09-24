const express = require('express');
const multer = require('multer');
const pdf = require('html-pdf');
const bodyParser = require('body-parser');
  const moment = require('moment');

const fs = require('fs');
const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var con=0;
var subject=0;
var teacher=0;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// Initialize the Express app
// Set the view engine to ejs
app.set('view engine', 'ejs');

// Set the views directory if it's not the default "views"
app.set('views', __dirname + '/views');

// Use middleware to serve static files (optional, if you have CSS, JS, images)
app.use(express.static('public'));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

const GOOGLE_API_KEY = "AIzaSyDT44DwhkyBDfA8pjggMguusRaMEyp0VhM"; // Use environment variable if deploying
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY); // Use the constant directly

// Helper function to extract JSON array from text
function extractJsonArray(text) {
  const jsonArrayPattern = /\[(.*?)\]/s;
  const match = text.match(jsonArrayPattern);
  if (match && match[0]) {
    return match[0]; // Return the JSON array portion
  } else {
    throw new Error('No JSON array found in the text.');
  }
}

// Function to process the image and generate content
async function run(imagePath) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    "give me names of all in array in json?",
    {
      inlineData: {
        data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
        mimeType: 'image/jpeg',
      },
    },
  ]);

  const responseText = await result.response.text();
  // console.log('Response Text:', responseText);

  const jsonArrayText = extractJsonArray(responseText);
  // console.log('Extracted JSON Array:', jsonArrayText);

  const namesArray = JSON.parse(jsonArrayText);
  // console.log('Names List:', namesArray);
return namesArray;
  // Clean up uploaded image after use
  fs.unlinkSync(imagePath);
}

// Serve the HTML form to upload image
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html')); // Serve the HTML page
// });
app.get('/', (req, res) => {
  res.render('index')  // This will render views/index.ejs
})
app.get('/teacher', (req, res) => {
    res.render('teacher');  // This will render views/index.ejs
});
app.get('/subject', (req, res) => {
    res.render('subject');  // This will render views/index.ejs
});

// Handle the image upload and call `run` function
app.post('/teacher', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path; // Path to the uploaded image
  try {
    teacher=await run(imagePath);
    console.log(teacher)
    res.redirect("/subject")
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).send('Failed to process image.');
  }
});
app.post('/subject', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path; // Path to the uploaded image
  try {
    subject = await run(imagePath);
    console.log(subject)
    res.render("generate_time")
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).send('Failed to process image.');
  }
});
// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional


// Start the server
// Route to handle form submission
app.post('/submit-quiz-form', (req, res) => {
    const quizPerDay = req.body.quizPerDay;
    const startDate = req.body.startDate;
    const startTime = req.body.startTime;
    const endTime = req.body.endTime;

    // You can now handle the form data here
    console.log('Form Data:', {
        quizPerDay,
        startDate,
        startTime,
        endTime
    });

  // Example start date
    const teachers = teacher;
    const subjects = subject;
    const subjectCapacity = quizPerDay;
 
const time_range = divideTimeRange(startTime, endTime);
console.log(time_range); // ["09:00", "12:00", "15:00"]
    const timetable = generateTimetable(startDate, teachers, subjects,subjectCapacity);
    res.render('help', { timetable,time_range });
   
});
app.get('/help', (req, res) => {
    const startDate = '2024-09-02'; // Example start date
    const teachers = ['Mr. Smith', 'Ms. Johnson', 'Mrs. Brown', 'Mr. Lee', 'Ms. Davis','Ms. Davisdas','Ms. Davasais'];
    const subjects = ['Math', 'Science', 'English', 'History', 'Geography'];
    const subjectCapacity=2;
    const startTime= '10:00';
  const endTime= '14:00';
    const time_range = divideTimeRange(startTime, endTime);
console.log(time_range);
    const timetable = generateTimetable(startDate, teachers, subjects,subjectCapacity);
    res.render('help', { timetable,time_range });
});function generateTimetable(startDate, teachers, subjects, subjectCapacity) {
    let timetable = {};
    let currentDate = moment(startDate);
    let teacherIndex = 0;
    let subjectAssignments = {}; // Track assigned counts for each subject

    // Initialize subject assignments to zero for each subject
    subjects.forEach(subject => {
        subjectAssignments[subject] = 0; // Initialize count for each subject
    });

    // Calculate the total number of days needed
    const totalSubjects = subjects.length;
    const totalDays = Math.ceil(totalSubjects / subjectCapacity); // Calculate required days

    for (let day = 1; day <= totalDays; day++) {
        // Skip weekends
        while (currentDate.day() === 6 || currentDate.day() === 0) {
            currentDate.add(1, 'days');
        }

        let dayName = currentDate.format('dddd');
        let date = currentDate.format('MMMM Do YYYY');
        let key = `Day ${day} - ${dayName}, ${date}`;

        timetable[key] = [];

        for (let slot = 0; slot < 3; slot++) { // Assuming 3 slots per day
            let assigned = false;

            // Check if all subjects are full before proceeding to assign
            const allSubjectsFull = subjects.every(subj => subjectAssignments[subj] >= subjectCapacity);
            if (allSubjectsFull) {
                break; // Stop assigning if all subjects are full
            }

            // Try to assign a teacher to a subject until successful
            while (!assigned) {
                const subject = subjects[teacherIndex % subjects.length]; // Use teacherIndex to cycle through subjects

                // Check if the subject has reached its capacity
                if (subjectAssignments[subject] < subjectCapacity) {
                    timetable[key].push({
                        teacher: teachers[teacherIndex],
                        subject: subject
                    });

                    // Increment the count of assigned teachers for this subject
                    subjectAssignments[subject]++;
                    assigned = true; // Mark as successfully assigned
                }

                // Move to the next teacher
                teacherIndex = (teacherIndex + 1) % teachers.length;

                // If we go through all teachers and couldn't assign, break
                if (teacherIndex === 0) {
                    break; // No available assignments left
                }
            }
        }

        currentDate.add(1, 'days'); // Move to the next day
    }

    return timetable;
}
function divideTimeRange(startTime, endTime) {
    // Convert input times to Date objects
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    // Calculate the total time in milliseconds
    const totalTime = end - start;

    // Calculate the interval for each part
    const interval = totalTime / 3;

    // Create an array to hold the time ranges
    const timeRanges = [];

    for (let i = 0; i < 3; i++) {
        const partStart = new Date(start.getTime() + i * interval);
        const partEnd = new Date(start.getTime() + (i + 1) * interval);

        // Format time to HH:MM
        const partStartTime = partStart.toTimeString().slice(0, 5);
        const partEndTime = partEnd.toTimeString().slice(0, 5);

        // Create the range string and push to the array
        timeRanges.push(`${partStartTime} to ${partEndTime}`);
    }

    return timeRanges;
}







app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

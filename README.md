# Task Management App Project

## Introduction
The goal of this project was to create a simple, offline, desktop application with local storage. This project was intended for learning and enhancing skills within Javascript, HTML and CSS, aswell as rapid development and testing of key features. My intention was to use these tools to keep the project as simple as possible when working with Electron. I used AI to help implement some of the more complex features, as well as other online learning tools like W3schools.

## Description
This task management app uses the style of Kanban to help users visualise workflows. Trello is a popular tool for this, as a result I tried to create something similar with an offline-first approach. 

App functionality:
- Create, read, update and delete (CRUD) boards, columns and cards.
- Drag and drop cards between columns.
- Create colourful labels cards.
- Add due date/time to cards, that changes colour depending on when the task is due.
- Add descriptions and notes to cards.
- Mark cards as complete.
- Icons show on cards to indicate what data it holds. e.g. description, date etc.
- Add a background image to each board with optional blur effect.
- Saves data locally to JSON file.
- Change the accent colour of the app.
- See how many cards are currently in a column.

## Key Takeaways
I gained a deeper understanding of how desktop apps are developed using web technologies, experiencing the full life cycle from initial planning to an executable app. During testing the application ran smoothly, after packaging with Electron a few features broke. As a result, I learned more about Electron and how it loads resources in production. I have a lot of fun working with CSS. The instant visual feedback allows you to see the big picture and bring a style to life. Overall I enjoyed working on the project, it was difficult at times, but I was able to learn a lot about planning, the phases of development, fundamentals of programming and how technologies interact with eachother. 

For the sake of simplicity and speed, I kept the main code all in one script. For a serious project I'd change that in future, so the code is earier to read, implement, debug and scale. Although I'm happy with the tools I used, I've heard good things about Tauri and would probably opt for it for future projects that are of similar size to this one.

## Technologies used
- JavaScript
- HTML
- CSS
- JSON
- Electron
- Node.JS
- Git Bash


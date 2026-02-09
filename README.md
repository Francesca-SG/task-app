# Task Management App Project

## Introduction
The goal of this project was to create a simple, offline, desktop application with local storage. This project was intended for learning and enhancing skills within Javascript, HTML and CSS. My intention was to use these tools to keep the project as simple as possible when working with Electron. I used AI to help me implement some of the more complex features, as well as other online learning tools like W3schools. I learned a lot in the process about my own skills and the limitations of the tools.

## Description
This task management app uses the style of Kanban to help users visualise workflows. Trello is a popular tool for this, as a result I tried to create something similar with an offline-first approach. 

App functionality:
- Create, read, update and delete (CRUD) boards, columns and cards.
- Drag and drop cards between columns.
- Create colourful labels cards.
- Add due date/time to cards, that changes colour depending on when the task is due.
- Add descriptions and notes to cards.
- Icons show on cards to indicate what data it holds. e.g. description, date etc.
- Add a background image to each board with optional blur effect.
- Saves data locally to JSON file.
- Change the accent colour of the app.
- See how many cards are currently in a column.

## Difficulties
I ran into numerous issues when attempting to package the app with Electron as well as an interesting bug. When windows shows a system dialog (like after deleting a file) Electron would lose focus and does not regain it. I added a fix that forcibly refocuses the app after any deletion. 


## Tools used
- JavaScript
- HTML
- CSS
- JSON
- Electron
- Git Bash


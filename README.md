# 🧪 Supplemental

![GitHub last commit](https://img.shields.io/github/last-commit/MigelusMaximus/supplement-tracker)
![GitHub issues](https://img.shields.io/github/issues/MigelusMaximus/supplement-tracker)
![GitHub stars](https://img.shields.io/github/stars/MigelusMaximus/supplement-tracker?style=social)
![GitHub license](https://img.shields.io/github/license/MigelusMaximus/supplement-tracker)


A powerful desktop application for monitoring supplement usage, tracking effects, assigning grades, and finding the best local prices.

> **Note:** The application is initially tailored for personal use, but it is designed to be flexible for broader usage and can easily be adapted for general audiences.

---


## 📑 Table of Contents


1. [Project Objective](#-project-objective)
2. [Features](#%EF%B8%8F-features)
3. [Technology Stack](#-technology-stack)
4. [Installation Instructions](#%EF%B8%8F-installation-instructions)
5. [Usage Instructions](#-usage-instructions)
6. [Project Roadmap](#-project-roadmap)
7. [Contributing](#-contributing)
8. [License](#-license)
9. [Contact](#-contact)


---

## 🎯 **Project Objective**

The goal of **Supplemental** is to provide an organized platform for tracking supplement usage, analyzing the benefits or drawbacks of different combinations, and ranking supplements based on their effectiveness.

Administrators can manage detailed supplement data including descriptions, effects, tier rankings, and more. Users can then track their intake and receive personalized insights into their supplement plans.

---

## ⚙️ **Features**

- **Supplement Database Management**: Administrators can add, edit, and delete supplements with detailed descriptions, effects, and tier rankings.
- **Supplement Grading System**: Supplements are ranked from F-S tiers based on their effectiveness and research.
- **User Tracking & Insights**: Users can track their supplement intake and receive feedback on benefits and potential drawbacks.
- **Local Price Finder**: Track prices for supplements across different retailers (planned feature).
- **Analysis and Warnings**: Provides insights based on the user's current supplement stack and highlights potential risks or overlaps.

---

## 🚀 **Technology Stack**

- **Python**: Core programming language.
- **SQLAlchemy**: For database management (SQLite for local development).
- **PyQt5**: For the graphical user interface (GUI).
- **BeautifulSoup4**: Planned feature for web scraping to find supplement prices.

---

## 🛠️ **Installation Instructions**

To get the project up and running on your local machine, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MigelusMaximus/supplement-tracker.git
   cd supplement-tracker

2. **Set up a virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Linux/macOS
   venv\Scripts\activate  # On Windows
   ```

3. **Install the dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```bash
   python src/main.py
   ```

---

## 📊 **Usage Instructions**

1. **Administrator Mode**:
   - Add supplements with details such as name, tier (F-S), description, cost, and effects.
   - Update existing supplements or delete outdated entries.

2. **User Mode**:
   - Select supplements you are currently using.
   - Input how much of each supplement you're taking and when.
   - Receive insights on benefits, drawbacks, and warnings based on your combination of supplements.

3. **Planned Features**:
   - Price monitoring from local retailers.
   - Expanded analytics on supplement intake patterns.

---

## 🔥 **Project Roadmap**

**Version 0.1**:
   - Initial project setup with virtual environment and basic Git structure.
   - Add supplement functionality (administrator dashboard).
   - Basic database schema for supplements.

**Version 0.2**:
   - User interface for supplement selection and tracking.
   - Calendar integration to track supplement intake.
   - Basic insights into supplement stack.

**Version 0.3**:
   - Price monitoring feature to find the best prices.
   - Advanced analytics on supplement usage.

**Future Plans**:
   - Mobile app integration.
   - Cloud syncing for users across devices.
   - Supplement recommendations based on user goals.

---

## 🧑‍💻 **Contributing**

Contributions are welcome! Feel free to fork the repository, submit issues, or create pull requests. Here's how you can get involved:

1. Fork the project.
2. Create a feature branch:
   ```bash
   git checkout -b feature/YourFeature
   ```

3. Commit your changes:
   ```bash
   git commit -m "Add new feature"
   ```

4. Push to the branch:
   ```bash
   git push origin feature/YourFeature
   ```

5. Open a pull request!

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 **Contact**

- **Project Maintainer**: [Migelus Maxismus](mailto:svkguardian@gmail.com)
- **GitHub**: [MigelusMaximus](https://github.com/MigelusMaximus)

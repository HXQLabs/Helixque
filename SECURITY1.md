#include <iostream>
#include <string>
#include <cctype>
using namespace std;

// Function to check password strength
bool isStrongPassword(const string& password) {
    if (password.length() < 8) return false;

    bool hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;

    for (char ch : password) {
        if (isupper(ch)) hasUpper = true;
        else if (islower(ch)) hasLower = true;
        else if (isdigit(ch)) hasDigit = true;
        else hasSpecial = true;
    }

    return hasUpper && hasLower && hasDigit && hasSpecial;
}

int main() {
    string password;
    cout << "Enter your password: ";
    cin >> password;

    if (isStrongPassword(password)) {
        cout << "✅ Strong Password! Your password meets security standards.\n";
    } else {
        cout << "⚠️ Weak Password! Use at least 8 characters, including upper, lower, number, and special character.\n";
    }

    return 0;
}

import SwiftUI

struct MealEntryView: View {
    @State private var mealTime: Date = Date()
    @State private var mealType: MealType = .snack
    @State private var foodItems: String = ""
    @State private var stoolTime: Date = Date()
    @State private var stoolType: Int = 1

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Saisie repas")) {
                    DatePicker("Heure repas", selection: $mealTime)
                    Picker("Type de repas", selection: $mealType) {
                        ForEach(MealType.allCases, id: \.self) { type in
                            Text(type.label).tag(type)
                        }
                    }
                    TextField("Aliments et quantités", text: $foodItems)
                }
                Section(header: Text("Saisie selles")) {
                    DatePicker("Heure", selection: $stoolTime)
                    Picker("Type de selle (Bristol)", selection: $stoolType) {
                        ForEach(1..<8) { index in
                            Text("Bristol \(index)").tag(index)
                        }
                    }
                }
                Button("Enregistrer sur Google Drive") {
                    saveToGoogleDrive()
                }
            }
            .navigationTitle("Journal alimentaire")
        }
    }

    func saveToGoogleDrive() {
        guard let url = URL(string: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec") else { return }

        let entry = MealEntry(mealTime: mealTime, mealType: mealType.label, foodItems: foodItems, stoolTime: stoolTime, stoolType: stoolType)
        guard let data = try? JSONEncoder().encode(entry) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = data

        URLSession.shared.dataTask(with: request) { _, _, _ in
            // Handle response if needed
        }.resume()
    }
}

struct MealEntry: Codable {
    var mealTime: Date
    var mealType: String
    var foodItems: String
    var stoolTime: Date
    var stoolType: Int
}

enum MealType: String, CaseIterable {
    case snack = "En-cas"
    case lunch = "Midi"
    case dinner = "Soir"

    var label: String { self.rawValue }
}

#Preview {
    MealEntryView()
}

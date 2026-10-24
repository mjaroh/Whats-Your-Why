import AppIntents
import SwiftUI
import WidgetKit

// The must do widgets: Home Screen (small, medium, large) and Lock Screen.
// Tapping a must do checks it off through the app's server, using the key the
// app saved when widgets were turned on (App/WidgetBridge.swift).

// MARK: - Data

struct Must: Codable, Hashable {
    let id: Int
    let title: String
    var done: Bool
}

struct Day: Codable {
    let date: String
    var musts: [Must]
    let sleepLogged: Bool
}

enum Store {
    static let shared = UserDefaults(suiteName: "group.app.whatsyourwhy.askesis")

    static var token: String? { shared?.string(forKey: "widget.token") }
    static var baseURL: URL? { shared?.string(forKey: "widget.baseUrl").flatMap(URL.init(string:)) }

    /// The last day the server sent, so the widget still shows something offline.
    static var cached: Day? {
        get { shared?.data(forKey: "widget.cache").flatMap { try? JSONDecoder().decode(Day.self, from: $0) } }
        set { shared?.set(newValue.flatMap { try? JSONEncoder().encode($0) }, forKey: "widget.cache") }
    }

    /// Today's date where the phone is, as the server writes it (YYYY-MM-DD).
    static func today() -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    /// The cached day, but with nothing checked once it's past midnight.
    static func cachedToday() -> Day? {
        guard var day = cached else { return nil }
        if day.date != today() {
            day = Day(date: today(), musts: day.musts.map { Must(id: $0.id, title: $0.title, done: false) }, sleepLogged: false)
        }
        return day
    }
}

enum WidgetError: Error {
    case notLinked
    case signedOut
    case failed
}

enum API {
    private static func request(method: String, body: [String: Any]? = nil) throws -> URLRequest {
        guard let token = Store.token, let base = Store.baseURL else { throw WidgetError.notLinked }
        var url = base.appendingPathComponent("api/widget")
        if method == "GET" {
            var parts = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            parts.queryItems = [URLQueryItem(name: "tz", value: TimeZone.current.identifier)]
            url = parts.url!
        }
        var req = URLRequest(url: url, timeoutInterval: 15)
        req.httpMethod = method
        req.setValue(token, forHTTPHeaderField: "X-Widget-Key")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        return req
    }

    private static func send(_ req: URLRequest) async throws -> Day {
        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 { throw WidgetError.signedOut }
        guard status == 200 else { throw WidgetError.failed }
        let day = try JSONDecoder().decode(Day.self, from: data)
        Store.cached = day
        return day
    }

    static func fetch() async throws -> Day {
        try await send(request(method: "GET"))
    }

    static func set(id: Int, done: Bool) async throws -> Day {
        try await send(request(method: "POST", body: ["tz": TimeZone.current.identifier, "id": id, "done": done]))
    }
}

// MARK: - Checking a must do off

struct ToggleMustIntent: AppIntent {
    static var title: LocalizedStringResource = "Check off a must do"
    static var isDiscoverable = false

    @Parameter(title: "Habit") var habitId: Int
    @Parameter(title: "Done") var done: Bool

    init() {}

    init(habitId: Int, done: Bool) {
        self.habitId = habitId
        self.done = done
    }

    func perform() async throws -> some IntentResult {
        // Show the tap straight away; the server's answer replaces it.
        if var day = Store.cachedToday() {
            day.musts = day.musts.map { $0.id == habitId ? Must(id: $0.id, title: $0.title, done: done) : $0 }
            Store.cached = day
        }
        _ = try? await API.set(id: habitId, done: done)
        return .result()
    }
}

// MARK: - Timeline

struct MustsEntry: TimelineEntry {
    enum State {
        case needsSetup
        case day(Day)
    }

    let date: Date
    let state: State
}

struct Provider: TimelineProvider {
    static let sample = Day(
        date: "",
        musts: [
            Must(id: 1, title: "Stretch 10 minutes", done: true),
            Must(id: 2, title: "Drink water", done: false),
            Must(id: 3, title: "Lights out by 10", done: false),
        ],
        sleepLogged: true
    )

    func placeholder(in context: Context) -> MustsEntry {
        MustsEntry(date: Date(), state: .day(Self.sample))
    }

    func getSnapshot(in context: Context, completion: @escaping (MustsEntry) -> Void) {
        let day = context.isPreview ? Self.sample : (Store.cachedToday() ?? Self.sample)
        completion(MustsEntry(date: Date(), state: .day(day)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MustsEntry>) -> Void) {
        Task {
            let state: MustsEntry.State
            do {
                state = .day(try await API.fetch())
            } catch WidgetError.notLinked {
                state = .needsSetup
            } catch WidgetError.signedOut {
                Store.cached = nil
                state = .needsSetup
            } catch {
                state = Store.cachedToday().map { .day($0) } ?? .needsSetup
            }
            // Refresh every half hour, and just after midnight for the new day.
            let calendar = Calendar.current
            let midnight = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: Date())!)
            let next = min(Date().addingTimeInterval(30 * 60), midnight.addingTimeInterval(60))
            completion(Timeline(entries: [MustsEntry(date: Date(), state: state)], policy: .after(next)))
        }
    }
}

// MARK: - Views

private let ink = Color(red: 0x0B / 255, green: 0x0B / 255, blue: 0x0A / 255)
private let paper = Color(red: 0xF2 / 255, green: 0xEF / 255, blue: 0xE8 / 255)
private let mute = Color(red: 0x8A / 255, green: 0x86 / 255, blue: 0x7E / 255)

struct MustsView: View {
    @Environment(\.widgetFamily) private var family
    let entry: MustsEntry

    var body: some View {
        switch entry.state {
        case .needsSetup:
            setup
        case .day(let day):
            switch family {
            case .accessoryInline:
                Text(day.musts.isEmpty ? "Add your must dos" : "Must dos \(done(day))/\(day.musts.count)")
            case .accessoryCircular:
                circular(day)
            case .accessoryRectangular:
                rectangular(day)
            default:
                home(day)
            }
        }
    }

    private func done(_ day: Day) -> Int { day.musts.filter(\.done).count }

    @ViewBuilder private var setup: some View {
        switch family {
        case .accessoryInline:
            Text("Turn on Askesis widgets")
        case .accessoryCircular:
            Image(systemName: "checklist")
        default:
            VStack(alignment: .leading, spacing: 4) {
                Text("MUST DO").font(.caption2.weight(.semibold)).tracking(2).foregroundStyle(mute)
                Text("Open Askesis → Habit tracker → Turn on widgets")
                    .font(.caption)
                    .foregroundStyle(paper)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    private func circular(_ day: Day) -> some View {
        Gauge(value: Double(done(day)), in: 0...Double(max(day.musts.count, 1))) {
            Text("Must")
        } currentValueLabel: {
            Text("\(done(day))/\(day.musts.count)")
        }
        .gaugeStyle(.accessoryCircularCapacity)
    }

    private func rectangular(_ day: Day) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            if day.musts.isEmpty {
                Text("Add your must dos in Askesis").font(.caption)
            } else {
                ForEach(day.musts.prefix(3), id: \.id) { must in
                    Button(intent: ToggleMustIntent(habitId: must.id, done: !must.done)) {
                        HStack(spacing: 4) {
                            Image(systemName: must.done ? "checkmark.circle.fill" : "circle")
                            Text(must.title).lineLimit(1).strikethrough(must.done)
                        }
                        .font(.caption)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var rows: Int {
        switch family {
        case .systemSmall: return 4
        case .systemMedium: return 4
        default: return 8
        }
    }

    private func home(_ day: Day) -> some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 5 : 7) {
            HStack {
                Text("MUST DO").font(.caption2.weight(.semibold)).tracking(2).foregroundStyle(mute)
                Spacer()
                if !day.musts.isEmpty {
                    Text("\(done(day))/\(day.musts.count)").font(.caption2.weight(.bold)).foregroundStyle(paper)
                }
            }
            if day.musts.isEmpty {
                Text("Add your must dos in the habit tracker.").font(.caption).foregroundStyle(paper.opacity(0.7))
            } else {
                ForEach(day.musts.prefix(rows), id: \.id) { must in
                    Button(intent: ToggleMustIntent(habitId: must.id, done: !must.done)) {
                        HStack(spacing: 8) {
                            ZStack {
                                Circle()
                                    .strokeBorder(must.done ? paper : paper.opacity(0.4), lineWidth: 1.2)
                                    .background(Circle().fill(must.done ? paper : .clear))
                                if must.done {
                                    Image(systemName: "checkmark").font(.system(size: 8, weight: .bold)).foregroundStyle(ink)
                                }
                            }
                            .frame(width: 16, height: 16)
                            Text(must.title)
                                .font(family == .systemSmall ? .caption : .subheadline)
                                .lineLimit(1)
                                .foregroundStyle(must.done ? paper.opacity(0.45) : paper)
                                .strikethrough(must.done, color: paper.opacity(0.45))
                            Spacer(minLength: 0)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                if day.musts.count > rows {
                    Text("+\(day.musts.count - rows) more").font(.caption2).foregroundStyle(mute)
                }
            }
            Spacer(minLength: 0)
            if !day.sleepLogged {
                Text("Log your sleep").font(.caption2.weight(.semibold)).foregroundStyle(Color(red: 0xD4 / 255, green: 0x54 / 255, blue: 0x4A / 255))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Widget

struct MustsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AskesisMusts", provider: Provider()) { entry in
            MustsView(entry: entry)
                .containerBackground(for: .widget) { ink }
        }
        .configurationDisplayName("Must dos")
        .description("Check off today's must dos.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryRectangular, .accessoryCircular, .accessoryInline,
        ])
    }
}

@main
struct AskesisWidgets: WidgetBundle {
    var body: some Widget {
        MustsWidget()
    }
}

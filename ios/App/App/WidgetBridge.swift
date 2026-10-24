import Foundation
import Capacitor
import WidgetKit

/// Lets the web app turn the must do widgets on and off. The widgets' key and
/// the site address go in the app group the widget extension reads
/// (AskesisWidget/AskesisWidget.swift), then iOS is asked to redraw them.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "link", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise),
    ]

    static let appGroup = "group.app.whatsyourwhy.askesis"
    private var shared: UserDefaults? { UserDefaults(suiteName: Self.appGroup) }

    @objc func status(_ call: CAPPluginCall) {
        var supported = false
        if #available(iOS 17.0, *) { supported = true }
        call.resolve(["supported": supported, "linked": shared?.string(forKey: "widget.token") != nil])
    }

    @objc func link(_ call: CAPPluginCall) {
        guard let token = call.getString("token"), let baseUrl = call.getString("baseUrl"), let shared else {
            call.reject("Missing token")
            return
        }
        shared.set(token, forKey: "widget.token")
        shared.set(baseUrl, forKey: "widget.baseUrl")
        shared.removeObject(forKey: "widget.cache")
        reloadWidgets()
        call.resolve()
    }

    @objc func unlink(_ call: CAPPluginCall) {
        shared?.removeObject(forKey: "widget.token")
        shared?.removeObject(forKey: "widget.cache")
        reloadWidgets()
        call.resolve()
    }

    @objc func reload(_ call: CAPPluginCall) {
        reloadWidgets()
        call.resolve()
    }

    private func reloadWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}

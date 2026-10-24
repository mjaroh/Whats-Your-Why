import UIKit
import Capacitor

/// The app's web view. Registers the plugins that live in this app target
/// (rather than in an npm package) once Capacitor has loaded.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}

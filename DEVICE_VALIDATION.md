# Physical-device validation record

This matrix is the release evidence record for behavior that browser automation cannot prove. Keep one downloaded InfiMaze device-test JSON file per connection attempt and name it in the evidence column. Do not mark a row passed from desktop/mobile emulation alone.

## Required device coverage

| ID | Host | Participant | Network | Required observations | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PWA-A1 | Android Chrome installed PWA | — | Online then offline | Maskable icon, standalone launch, saved data, offline relaunch | Not run | — |
| PWA-I1 | iOS Safari home-screen app | — | Online then offline | Apple icon, safe areas, standalone launch, saved data, offline relaunch | Not run | — |
| PWA-D1 | Desktop Chrome or Edge installed PWA | — | Online | Install, taskbar icon, update prompt, data survives update | Not run | — |
| RTC-W1 | Desktop or mobile | Different physical device | Same Wi-Fi | Both QR directions, named peers, open channel, identical standings | Not run | — |
| RTC-C1 | Wi-Fi device | Cellular device | Cross-network | STUN route classification, connection outcome, retained standings | Not run | — |
| RTC-R1 | Previous RTC-W1 pair | Previous RTC-W1 pair | Same Wi-Fi | Refresh, fresh offer/answer, same room identity and standings | Not run | — |

Add rows for browsers or network conditions that expose a new behavior. A failed RTC-C1 result can be an expected network limitation when diagnostics show that no direct route opened; record the failure rather than treating it as an application pass.

## Capture a connection report

1. Open **Play → Local rankings → Serverless competition room** and perform the physical connection attempt.
2. Expand **Connection diagnostics → Device test report**.
3. Choose the network scenario and record whether QR camera scanning passed or failed.
4. Add the device model, operating-system version, browser version, and a short observation.
5. Select **Download device test report** on both devices.
6. Give the files names that reference the matrix ID, then record them in the Evidence column.

Reports contain browser/PWA capabilities, viewport, online state, and the summarized connection route/state. They exclude SDP, IP addresses, maze definitions, player names, standings, and local-storage contents.

## Release decision

The automated PR gate must pass in addition to this matrix. A release is ready when PWA-A1, PWA-I1, PWA-D1, RTC-W1, and RTC-R1 pass. RTC-C1 must be recorded; a restrictive-NAT failure is acceptable only when the app explains the no-TURN limitation and preserves local standings.

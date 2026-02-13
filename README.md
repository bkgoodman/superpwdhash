# SuperPWDHash - Mobile Phone Applet

Based off of work from [Stanford](https://crypto.stanford.edu/pwdhash/RemotePwdHash0.8/) and [Alex King](http://alexking.org)

**Try this live** at: [https://auth.makeitlabs.com/misc/superpwdhash/](https://auth.makeitlabs.com/misc/superpwdhash/)

## Features

- **Client-side password hashing** using SPH_HashedPassword algorithm
- **Offline PWA** - Works without internet connection once cached
- **Biometric master password storage** (optional) using WebAuthn PRF
- **Local storage only** - Bookmarks and data saved on device
- **No server communication** - Passwords never leave your device

## WebAuthn PRF Biometric Storage

SuperPWDHash now supports optional biometric storage of your master password using **WebAuthn PRF (Pseudo-Random Function)** - a cutting-edge approach to secure local password management. 

### How It Works

1. **Enrollment**: When you enable biometric storage, the app:
   - Generates a random seed on your device
   - Creates a WebAuthn credential with PRF extension
   - Uses biometric authentication + PRF to derive an AES encryption key
   - Encrypts your master password with this key
   - Stores only the encrypted password and seed locally

2. **Unlock**: When you use biometric unlock:
   - WebAuthn authenticates you with biometrics (fingerprint/face)
   - PRF generates the same deterministic key from the authentication
   - Key decrypts your master password locally
   - Password is filled in automatically

Note that Biometric support requires HTTPS. So you can use tool from any web page, Webauthn will only work on devices which support it (modern phones generally do, but desktop browsers not-so-much), and only with HTTPS.

### Security Benefits

- **Zero-knowledge**: Your master password is never stored in plaintext
- **Device-specific**: Each device has its own encrypted storage
- **No backups**: Everything stays on your device only
- **PRF innovation**: Uses biometric authentication as a deterministic key source
- **AES-GCM encryption**: Industry-standard authenticated encryption
- **Fallback option**: Manual password entry always available

### Important Notes

- **ON DEVICE ONLY**: No data is ever sent to servers or backed up
- **Device-specific**: Biometric credentials work only on the enrolled device
- **Optional feature**: You can continue using manual password entry
- **Security-first**: Biometric storage is disabled by default

## Usage

1. **Basic**: Enter master password manually each time (original behavior)
2. **Enhanced**: Enable biometric storage for quick unlock
3. **Reset**: Clear biometric credentials anytime and re-enroll

## Installation

Save on phone as Web Applet. Bookmarks are saved locally - passwords are not. Never sends passwords to server.

Use at: [https://bkgoodman.github.io/superpwdhash/](https://bkgoodman.github.io/superpwdhash/) - or save this link to your Home Page on your phone.

## Privacy & Security

- ✅ All processing happens on your device
- ✅ No network requests for password operations  
- ✅ No server storage or backups
- ✅ Biometric data never leaves your device
- ✅ Encrypted local storage only
- ✅ Manual entry always available

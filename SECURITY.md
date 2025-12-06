# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

The Itqan community takes the security of our software seriously. If you believe you have found a
security vulnerability in the CMS Frontend, please report it to us as described below.

### Please do NOT:

- Open a public GitHub issue for security vulnerabilities
- Publicly disclose the vulnerability before it has been addressed

### Please DO:

1. **Report privately through GitHub Security Advisories**:
   - Go to the [Security tab](https://github.com/Itqan-community/cms-frontend/security) of this
     repository
   - Click "Report a vulnerability"
   - Fill out the vulnerability report form with:
     - A description of the vulnerability
     - Steps to reproduce the issue
     - Potential impact of the vulnerability
     - Suggested fix (if you have one)

2. **Allow us time to respond** - We will acknowledge your report within 48 hours and will send a
   more detailed response within 7 days indicating the next steps in handling your report.

3. **Give us reasonable time to fix** - We will work to fix confirmed vulnerabilities as quickly as
   possible, and will keep you informed of our progress.

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release patches as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open
an issue to discuss.

## Security Updates

Security updates will be released as patch versions and announced in:

- GitHub Security Advisories
- Release notes
- Community announcements

## Best Practices for Users

To ensure you're using the CMS Frontend securely:

1. **Keep dependencies updated** - Regularly run `npm audit` and update dependencies
2. **Use environment variables** - Never commit API keys or secrets to the repository
3. **Follow HTTPS** - Always use HTTPS in production
4. **Review security headers** - Check the security headers in `netlify.toml`
5. **Monitor for updates** - Watch the repository for security announcements

## Recognition

We appreciate the security research community's efforts in helping us maintain a secure platform.
Security researchers who responsibly disclose vulnerabilities will be:

- Acknowledged in the security advisory (unless they prefer to remain anonymous)
- Credited in our release notes
- Recognized in our security hall of fame

Thank you for helping keep CMS Frontend and our users safe!

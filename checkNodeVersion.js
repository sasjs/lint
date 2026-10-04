const result = process.versions

// Mirrors engines.node. @sasjs/utils pulls in consola 3, which declares
// ^14.18.0 || >=16.10.0, so a major-only floor would admit versions whose own
// dependencies reject them - 14.0-14.17 and all of 15.x.
const satisfiesNode = (version) => {
  const [major, minor] = version.split('.').map(Number)

  if (major === 14) return minor >= 18
  if (major === 15) return false
  if (major === 16) return minor >= 10

  return major > 16
}

if (result && result.node) {
  if (!satisfiesNode(result.node)) {
    console.log(
      '\x1b[31m%s\x1b[0m',
      `❌ Process failed due to Node Version,\nPlease install and use Node Version ^14.18.0 || >=16.10.0\nYour current Node Version is: ${result.node}`
    )
    process.exit(1)
  }
} else {
  console.log(
    '\x1b[31m%s\x1b[0m',
    'Something went wrong while checking Node version'
  )
  process.exit(1)
}

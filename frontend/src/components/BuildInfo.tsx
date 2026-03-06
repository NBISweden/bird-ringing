export default function BuildInfo() {
  // Only render if at least one of the env vars is available
  const hasBuildInfo =
    process.env.NEXT_PUBLIC_BUILD_GIT_COMMIT ||
    process.env.NEXT_PUBLIC_BUILD_GIT_BRANCH;

  if (!hasBuildInfo) return null;

  return (
    <div className="build-info">
      <h2>Build info</h2>
      {process.env.NEXT_PUBLIC_BUILD_GIT_COMMIT && (
        <div>
          Commit: <code>{process.env.NEXT_PUBLIC_BUILD_GIT_COMMIT}</code>
        </div>
      )}
      {process.env.NEXT_PUBLIC_BUILD_GIT_BRANCH && (
        <div>
          Branch: <code>{process.env.NEXT_PUBLIC_BUILD_GIT_BRANCH}</code>
        </div>
      )}
    </div>
  );
}

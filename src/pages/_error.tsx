function ErrorPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        background: "#0b0b0f",
        color: "#f5f5f5",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ fontSize: "1rem", letterSpacing: "0.08em", opacity: 0.7 }}>
          Something went wrong
        </p>
        <h1 style={{ fontSize: "2.5rem", margin: "0.5rem 0 1rem" }}>
          We&apos;re working on it
        </h1>
        <p style={{ maxWidth: "34rem", margin: "0 auto" }}>
          An unexpected error occurred. Please refresh the page or try again shortly.
        </p>
      </div>
    </div>
  );
}

export default ErrorPage;

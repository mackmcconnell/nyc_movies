export default function Footer() {
  return (
    <footer className="border-t border-border mt-auto py-6">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
        Made by{" "}
        <a href="mailto:mack@hey.com" className="hover:opacity-80 transition-opacity">
          <span style={{ color: "#ff0000" }}>M</span>
          <span style={{ color: "#ff8800" }}>a</span>
          <span style={{ color: "#00cc00" }}>q</span>
          <span style={{ color: "#0066ff" }}>q</span>
        </a>{" "}
        in Brooklyn
      </div>
    </footer>
  );
}

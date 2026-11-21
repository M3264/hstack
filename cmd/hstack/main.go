// Command hstack installs hstack for Claude Code: the skills (hstack, hstack-activate,
// hstack-swarm, hstack-practice) and the worker sub-agents (hstack-worker, hstack-reviewer).
//
//	hstack            interactive setup (same as `hstack init`)
//	hstack init       [--worker haiku] [--yes]
//	hstack models     show the model list used to validate workers
//	hstack status     show the saved setup
//	hstack uninstall  remove the installed links and setup
package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/shellhaki/hstack"
)

var version = "dev"

type Model struct {
	ID    string   `json:"id"`
	Alias string   `json:"alias"`
	Name  string   `json:"name"`
	Names []string `json:"names"`
	Note  string   `json:"note"`
}

type ModelList struct {
	Updated    string  `json:"updated"`
	OrderNote  string  `json:"order_note"`
	Models     []Model `json:"models"`
	Benchmarks []struct {
		Name  string `json:"name"`
		Tests string `json:"tests"`
	} `json:"benchmarks"`
}

type Config struct {
	Version int    `json:"version"`
	Agent   string `json:"agent"`
	Worker  string `json:"worker"` // default worker alias suggested by /hstack-activate
	Home    string `json:"home"`
}

func home() string       { h, _ := os.UserHomeDir(); return h }
func hstackHome() string { return filepath.Join(home(), ".config", "hstack") }
func configPath() string { return filepath.Join(hstackHome(), "config.json") }
func claudeHome() string {
	if d := os.Getenv("CLAUDE_CONFIG_DIR"); d != "" {
		return d
	}
	return filepath.Join(home(), ".claude")
}

func bold(s string) string { return "\033[1m" + s + "\033[0m" }
func dim(s string) string  { return "\033[2m" + s + "\033[0m" }

func loadModels() (*ModelList, error) {
	b, err := hstack.Assets.ReadFile("models/claude.json")
	if err != nil {
		return nil, err
	}
	var m ModelList
	return &m, json.Unmarshal(b, &m)
}

// resolve matches a loose name ("Haiku 5.5", "claude-haiku-5-5", "haiku") to a model.
func (l *ModelList) resolve(s string) (Model, bool) {
	norm := func(x string) string {
		x = strings.ToLower(strings.TrimSpace(x))
		x = strings.ReplaceAll(x, "claude", "")
		return strings.NewReplacer(" ", "", "-", "", "_", "", ".", "").Replace(x)
	}
	want := norm(s)
	if want == "" {
		return Model{}, false
	}
	for _, m := range l.Models {
		cands := append([]string{m.ID, m.Alias, m.Name}, m.Names...)
		for _, c := range cands {
			if norm(c) == want {
				return m, true
			}
		}
	}
	return Model{}, false
}

var in = bufio.NewReader(os.Stdin)

func ask(prompt, def string) string {
	fmt.Printf("%s [%s]: ", prompt, def)
	line, err := in.ReadString('\n')
	line = strings.TrimSpace(line)
	if line == "" || err != nil {
		return def
	}
	return line
}

// install extracts the embedded files into ~/.config/hstack and links skills and agents into Claude Code.
func install() error {
	dst := hstackHome()
	err := fs.WalkDir(hstack.Assets, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		target := filepath.Join(dst, p)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		b, err := hstack.Assets.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(target, b, 0o644)
	})
	if err != nil {
		return err
	}
	link := func(src, dest string) error {
		if fi, err := os.Lstat(dest); err == nil {
			if fi.Mode()&os.ModeSymlink == 0 {
				fmt.Printf("  skip %s: exists and is not an hstack link\n", dest)
				return nil
			}
			_ = os.Remove(dest)
		}
		if err := os.Symlink(src, dest); err != nil {
			return err
		}
		fmt.Printf("  %s %s\n", dim("linked"), dest)
		return nil
	}
	for _, sub := range []string{"skills", "agents"} {
		if err := os.MkdirAll(filepath.Join(claudeHome(), sub), 0o755); err != nil {
			return err
		}
		entries, _ := os.ReadDir(filepath.Join(dst, sub))
		for _, e := range entries {
			if err := link(filepath.Join(dst, sub, e.Name()), filepath.Join(claudeHome(), sub, e.Name())); err != nil {
				return err
			}
		}
	}
	return nil
}

func cmdInit(args []string) error {
	fl := flag.NewFlagSet("init", flag.ExitOnError)
	worker := fl.String("worker", "", "default worker model (e.g. haiku)")
	yes := fl.Bool("yes", false, "accept defaults without prompting")
	_ = fl.Parse(args)

	fmt.Println(bold("hstack setup") + dim("  small models do the work, frontier models direct it"))
	fmt.Println("Agent: Claude Code " + dim("(other agents later)"))
	if _, err := exec.LookPath("claude"); err != nil {
		fmt.Println("  note: `claude` is not on your PATH; installing anyway.")
	}
	ml, err := loadModels()
	if err != nil {
		return err
	}

	// Default worker: the frontier is picked per session (the model you run), and
	// /hstack-activate validates the worker against it. Here we only record a suggestion.
	def := ml.Models[len(ml.Models)-1].Alias
	for {
		if *worker == "" && !*yes {
			*worker = ask("\nDefault worker model, suggested by /hstack-activate (e.g. haiku, sonnet)", def)
		} else if *worker == "" {
			*worker = def
		}
		m, ok := ml.resolve(*worker)
		if ok && m.Alias != ml.Models[0].Alias {
			*worker = m.Alias
			break
		}
		if ok {
			fmt.Printf("  %s is the most capable model, so it can't be a worker. Pick a smaller one.\n", m.Name)
		} else {
			fmt.Printf("  I don't know %q. Options: %s\n", *worker, aliases(ml.Models[1:]))
		}
		if *yes {
			return fmt.Errorf("invalid --worker %q", *worker)
		}
		*worker = ""
	}

	fmt.Println()
	fmt.Println(bold("Installing"))
	if err := install(); err != nil {
		return err
	}
	cfg := Config{Version: 2, Agent: "claude", Worker: *worker, Home: hstackHome()}
	b, _ := json.MarshalIndent(cfg, "", "  ")
	if err := os.WriteFile(configPath(), append(b, '\n'), 0o644); err != nil {
		return err
	}
	fmt.Printf("  %s %s\n", dim("saved"), configPath())

	fmt.Println()
	fmt.Println(bold("Done.") + " Next:")
	fmt.Println("  1. Start Claude Code on your frontier model, e.g.  claude --model opus")
	fmt.Println("  2. Run  /hstack-activate  and name the worker (it suggests " + *worker + ")")
	fmt.Println("  3. Give it a real task. Use  /hstack-swarm  for parallel workers.")
	return nil
}

func aliases(ms []Model) string {
	var out []string
	for _, m := range ms {
		out = append(out, m.Alias)
	}
	return strings.Join(out, ", ")
}

func cmdModels() error {
	ml, err := loadModels()
	if err != nil {
		return err
	}
	fmt.Printf("%s  (updated %s)\n", bold("Claude models, most to least capable"), ml.Updated)
	for i, m := range ml.Models {
		note := ""
		if m.Note != "" {
			note = "  " + dim(m.Note)
		}
		fmt.Printf("  %d. %-18s %-8s %s%s\n", i+1, m.Name, m.Alias, dim(m.ID), note)
	}
	fmt.Println("\n" + dim(ml.OrderNote))
	return nil
}

func cmdStatus() error {
	b, err := os.ReadFile(configPath())
	if err != nil {
		fmt.Println("hstack is not set up yet. Run: hstack")
		return nil
	}
	fmt.Print(string(b))
	return nil
}

func cmdUninstall() error {
	for _, sub := range []string{"skills", "agents"} {
		entries, _ := os.ReadDir(filepath.Join(hstackHome(), sub))
		for _, e := range entries {
			p := filepath.Join(claudeHome(), sub, e.Name())
			if fi, err := os.Lstat(p); err == nil && fi.Mode()&os.ModeSymlink != 0 {
				_ = os.Remove(p)
				fmt.Println("  removed", p)
			}
		}
	}
	if strings.EqualFold(ask("Remove "+hstackHome()+" too? (y/N)", "N"), "y") {
		if err := os.RemoveAll(hstackHome()); err != nil {
			return err
		}
		fmt.Println("  removed", hstackHome())
	}
	return nil
}

func main() {
	cmd, args := "init", []string{}
	if len(os.Args) > 1 {
		cmd, args = os.Args[1], os.Args[2:]
		if strings.HasPrefix(cmd, "-") {
			cmd, args = "init", os.Args[1:]
		}
	}
	var err error
	switch cmd {
	case "init":
		err = cmdInit(args)
	case "models":
		err = cmdModels()
	case "status":
		err = cmdStatus()
	case "uninstall":
		err = cmdUninstall()
	case "version", "--version":
		fmt.Println("hstack", version)
	case "help", "-h", "--help":
		fmt.Println("usage: hstack [init|models|status|uninstall|version]")
	default:
		err = fmt.Errorf("unknown command %q (try: hstack help)", cmd)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

// Command hstack installs the hstack skills for your coding agent and records which
// frontier and small models to use.
//
//	hstack            interactive setup (same as `hstack init`)
//	hstack init       [--agent muse] [--frontier ID] [--small ID|auto] [--yes]
//	hstack models     show the model rankings and where they come from
//	hstack status     show the saved setup
//	hstack uninstall  remove the installed skills and setup
package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/shellhaki/hstack"
)

var version = "dev"

// ---------- model rankings ----------

type Model struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Composite *float64 `json:"composite"`
	Frontier  *float64 `json:"frontiercode"`
	Terminal  *float64 `json:"terminalbench"`
	SWEAtlas  *float64 `json:"sweatlas"`
	CostTask  *float64 `json:"cost_per_task"`
	Minutes   *float64 `json:"minutes_per_task"`
	Note      string   `json:"note"`
}

type Rankings struct {
	Agent      string `json:"agent"`
	Updated    string `json:"updated"`
	Benchmarks []struct {
		Name  string `json:"name"`
		Tests string `json:"tests"`
	} `json:"benchmarks"`
	Source struct {
		Name string `json:"name"`
		URL  string `json:"url"`
		Note string `json:"note"`
	} `json:"source"`
	Models []Model `json:"models"`
}

func loadRankings(agent string) (*Rankings, error) {
	b, err := hstack.Assets.ReadFile("models/" + agent + ".json")
	if err != nil {
		return nil, fmt.Errorf("no model rankings for agent %q", agent)
	}
	var r Rankings
	if err := json.Unmarshal(b, &r); err != nil {
		return nil, err
	}
	return &r, nil
}

func score(m Model) float64 {
	if m.Composite == nil {
		return -1
	}
	return *m.Composite
}

// ranked returns models with an ID, best composite score first (unranked last).
func (r *Rankings) ranked() []Model {
	var out []Model
	for _, m := range r.Models {
		if m.ID != "" {
			out = append(out, m)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return score(out[i]) > score(out[j]) })
	return out
}

func (r *Rankings) byID(id string) (Model, bool) {
	for _, m := range r.Models {
		if m.ID == id {
			return m, true
		}
	}
	return Model{}, false
}

// below returns ranked models that score strictly lower than the frontier: valid small models.
func (r *Rankings) below(frontier string) []Model {
	f, ok := r.byID(frontier)
	var out []Model
	for _, m := range r.ranked() {
		if m.ID == frontier || score(m) < 0 {
			continue
		}
		if !ok || score(m) < score(f) {
			out = append(out, m)
		}
	}
	return out
}

// ---------- agents ----------

type Agent struct {
	Key, Name, Binary, SkillsDir string
	// available reports whether a model id is in the agent's catalog (best effort).
	available func(id string) bool
}

func home() string { h, _ := os.UserHomeDir(); return h }

var agents = []Agent{
	{
		Key: "muse", Name: "Muse Code", Binary: "muse",
		SkillsDir: filepath.Join(home(), ".config", "muse", "skills"),
		available: func(id string) bool {
			if _, err := exec.LookPath("muse"); err != nil {
				return true // can't check without muse; assume yes
			}
			return exec.Command("muse", "model-profile", "show", id).Run() == nil
		},
	},
}

func findAgent(key string) (Agent, error) {
	for _, a := range agents {
		if a.Key == key {
			return a, nil
		}
	}
	return Agent{}, fmt.Errorf("unknown agent %q (supported: muse)", key)
}

// ---------- config ----------

type Config struct {
	Version   int      `json:"version"`
	Agent     string   `json:"agent"`
	Frontier  string   `json:"frontier"`
	Small     string   `json:"small"`     // model id, or "auto"
	Fallbacks []string `json:"fallbacks"` // small models to try in order if one is unavailable
	Home      string   `json:"home"`
}

func hstackHome() string { return filepath.Join(home(), ".config", "hstack") }
func configPath() string { return filepath.Join(hstackHome(), "config.json") }

func readConfig() (*Config, error) {
	b, err := os.ReadFile(configPath())
	if err != nil {
		return nil, err
	}
	var c Config
	return &c, json.Unmarshal(b, &c)
}

// ---------- prompts ----------

var in = bufio.NewReader(os.Stdin)

func choose(title string, options []string, def int) int {
	fmt.Println()
	fmt.Println(bold(title))
	for i, o := range options {
		marker := "  "
		if i == def {
			marker = "› "
		}
		fmt.Printf("  %s%d) %s\n", marker, i+1, o)
	}
	for {
		fmt.Printf("  choose [%d]: ", def+1)
		line, err := in.ReadString('\n')
		line = strings.TrimSpace(line)
		if line == "" || errors.Is(err, os.ErrClosed) {
			return def
		}
		var n int
		if _, e := fmt.Sscanf(line, "%d", &n); e == nil && n >= 1 && n <= len(options) {
			return n - 1
		}
		if err != nil {
			return def
		}
		fmt.Println("  enter a number from the list")
	}
}

func bold(s string) string { return "\033[1m" + s + "\033[0m" }
func dim(s string) string  { return "\033[2m" + s + "\033[0m" }

func describe(m Model) string {
	s := m.Name + "  " + dim(m.ID)
	if m.Composite != nil {
		s += fmt.Sprintf("  · score %.0f", *m.Composite)
	}
	if m.CostTask != nil {
		s += fmt.Sprintf(" · $%.2f/task", *m.CostTask)
	}
	return s
}

// ---------- install ----------

func install(a Agent) error {
	dst := hstackHome()
	if err := os.MkdirAll(dst, 0o755); err != nil {
		return err
	}
	// Extract skills, scripts and models (overwrite; this is hstack's own folder).
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
		mode := fs.FileMode(0o644)
		if strings.HasSuffix(p, ".sh") {
			mode = 0o755
		}
		return os.WriteFile(target, b, mode)
	})
	if err != nil {
		return err
	}
	// Link each skill into the agent's skills folder (skills find scripts two levels up from their real path).
	if err := os.MkdirAll(a.SkillsDir, 0o755); err != nil {
		return err
	}
	entries, _ := os.ReadDir(filepath.Join(dst, "skills"))
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		link := filepath.Join(a.SkillsDir, e.Name())
		if fi, err := os.Lstat(link); err == nil {
			if fi.Mode()&os.ModeSymlink == 0 {
				fmt.Printf("  skip %s: %s exists and is not an hstack link\n", e.Name(), link)
				continue
			}
			_ = os.Remove(link)
		}
		if err := os.Symlink(filepath.Join(dst, "skills", e.Name()), link); err != nil {
			return err
		}
		fmt.Printf("  %s %s\n", dim("linked"), link)
	}
	return nil
}

// ---------- commands ----------

func cmdInit(args []string) error {
	fl := flag.NewFlagSet("init", flag.ExitOnError)
	agentKey := fl.String("agent", "", "agent: muse")
	frontier := fl.String("frontier", "", "frontier model id (the model you run sessions with)")
	small := fl.String("small", "", "small model id, or auto")
	yes := fl.Bool("yes", false, "accept defaults without prompting")
	_ = fl.Parse(args)

	fmt.Println(bold("hstack setup") + dim("  small models do the work, frontier models direct it"))

	// 1. Agent
	if *agentKey == "" {
		names := []string{}
		for _, a := range agents {
			names = append(names, a.Name)
		}
		names = append(names, dim("Claude Code, Cursor, OpenCode (coming later)"))
		i := 0
		if !*yes {
			for {
				i = choose("Which agent do you use?", names, 0)
				if i < len(agents) {
					break
				}
				fmt.Println("  not supported yet, pick Muse Code for now")
			}
		}
		*agentKey = agents[i].Key
	}
	a, err := findAgent(*agentKey)
	if err != nil {
		return err
	}
	if _, err := exec.LookPath(a.Binary); err != nil {
		fmt.Printf("\n  note: `%s` is not on your PATH; skills will be installed anyway.\n", a.Binary)
	}
	r, err := loadRankings(a.Key)
	if err != nil {
		return err
	}

	// 2. Frontier: only models this account can use.
	var avail []Model
	for _, m := range r.ranked() {
		if a.available(m.ID) {
			avail = append(avail, m)
		}
	}
	if len(avail) == 0 {
		return errors.New("no models from the rankings are available on this account")
	}
	if *frontier == "" {
		opts := []string{}
		for _, m := range avail {
			opts = append(opts, describe(m))
		}
		i := 0
		if !*yes {
			i = choose("Frontier model: the model you run sessions with (it directs)", opts, 0)
		}
		*frontier = avail[i].ID
	}

	// 3. Small model: must rank below the frontier.
	var smalls []Model
	for _, m := range r.below(*frontier) {
		if a.available(m.ID) {
			smalls = append(smalls, m)
		}
	}
	if len(smalls) == 0 {
		fmt.Printf("\n  %s is the lowest-ranked model available, so there is nothing smaller to delegate to.\n", *frontier)
		fmt.Println("  hstack will install, but /hstack-activate stays inactive in sessions on this model.")
		*small = ""
	} else if *small == "" {
		opts := []string{"auto " + dim("(recommended: the best-ranked model below your frontier, with fallbacks)")}
		for _, m := range smalls {
			opts = append(opts, describe(m))
		}
		i := 0
		if !*yes {
			i = choose("Small model: does the engineering (spec, plan, tests, code)", opts, 0)
		}
		if i == 0 {
			*small = "auto"
		} else {
			*small = smalls[i-1].ID
		}
	}

	// Fallbacks: every valid small model, chosen one first.
	fallbacks := []string{}
	for _, m := range smalls {
		if m.ID != *small {
			fallbacks = append(fallbacks, m.ID)
		}
	}
	if *small != "" && *small != "auto" {
		fallbacks = append([]string{*small}, fallbacks...)
	}

	cfg := Config{Version: 1, Agent: a.Key, Frontier: *frontier, Small: *small, Fallbacks: fallbacks, Home: hstackHome()}

	fmt.Println()
	fmt.Println(bold("Installing"))
	if err := install(a); err != nil {
		return err
	}
	b, _ := json.MarshalIndent(cfg, "", "  ")
	if err := os.WriteFile(configPath(), append(b, '\n'), 0o644); err != nil {
		return err
	}
	fmt.Printf("  %s %s\n", dim("saved"), configPath())

	fmt.Println()
	fmt.Println(bold("Done.") + " Next:")
	fmt.Printf("  1. Start %s on your frontier model:  %s --model %s\n", a.Name, a.Binary, cfg.Frontier)
	fmt.Println("  2. In the session, run:  /hstack-activate")
	fmt.Println("  3. Give it a task. It writes a short intake and lets the small model do the work.")
	return nil
}

func cmdModels(args []string) error {
	agentKey := "muse"
	if len(args) > 0 {
		agentKey = args[0]
	}
	r, err := loadRankings(agentKey)
	if err != nil {
		return err
	}
	fmt.Printf("%s  (%s, updated %s)\n\n", bold("Model rankings"), agentKey, r.Updated)
	fmt.Printf("  %-28s %6s %8s %8s %8s %10s\n", "model", "score", "FrontC", "TermB", "SWEAt", "cost/task")
	f := func(p *float64, prefix string) string {
		if p == nil {
			return "–"
		}
		return fmt.Sprintf("%s%.0f", prefix, *p)
	}
	for _, m := range r.Models {
		cost := "–"
		if m.CostTask != nil {
			cost = fmt.Sprintf("$%.2f", *m.CostTask)
		}
		fmt.Printf("  %-28s %6s %8s %8s %8s %10s\n", m.Name, f(m.Composite, ""), f(m.Frontier, ""), f(m.Terminal, ""), f(m.SWEAtlas, ""), cost)
	}
	fmt.Println()
	fmt.Println(bold("Benchmarks"))
	for _, b := range r.Benchmarks {
		fmt.Printf("  %-22s %s\n", b.Name, b.Tests)
	}
	fmt.Println()
	fmt.Println(bold("Credit") + "  " + r.Source.Name)
	if r.Source.URL != "" {
		fmt.Println("  " + r.Source.URL)
	}
	fmt.Println("  " + dim(r.Source.Note))
	return nil
}

func cmdStatus() error {
	c, err := readConfig()
	if err != nil {
		fmt.Println("hstack is not set up yet. Run: hstack")
		return nil
	}
	b, _ := json.MarshalIndent(c, "", "  ")
	fmt.Println(string(b))
	return nil
}

func cmdUninstall() error {
	c, err := readConfig()
	if err == nil {
		if a, err := findAgent(c.Agent); err == nil {
			entries, _ := os.ReadDir(filepath.Join(hstackHome(), "skills"))
			for _, e := range entries {
				link := filepath.Join(a.SkillsDir, e.Name())
				if fi, err := os.Lstat(link); err == nil && fi.Mode()&os.ModeSymlink != 0 {
					_ = os.Remove(link)
					fmt.Println("  removed", link)
				}
			}
		}
	}
	fmt.Printf("Remove %s too? [y/N]: ", hstackHome())
	line, _ := in.ReadString('\n')
	if strings.EqualFold(strings.TrimSpace(line), "y") {
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
		err = cmdModels(args)
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

// Package hstack embeds the skills, sub-agent definitions and model list so the CLI can
// install them without cloning the repository.
package hstack

import "embed"

//go:embed skills agents models
var Assets embed.FS

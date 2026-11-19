// Package hstack embeds the skills, scripts and model rankings so the CLI can install them
// without cloning the repository.
package hstack

import "embed"

//go:embed skills scripts models
var Assets embed.FS

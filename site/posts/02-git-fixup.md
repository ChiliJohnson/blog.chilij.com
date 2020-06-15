---
title: "Using git's `autostash` and `autosquash` for effortless fixups"
description: Using `git rebase` in combination with its `--autostash` and `--autosquash` options makes amending historical commits easy. Using git's message-based revision syntax makes it even easier.
permalink: /posts/git-fixup-autostash-autosquash/
date: 2020-06-14
tags:
  - git
  - source control
  - amend
  - fixup
  - autostash
  - autosquash
  - shell
  - scripting
  - terminal
  - cli
  - shortcut
layout: layouts/post.njk
---

Applying fixups to your last commit in `git` is pretty easy using `git commit --amend`, but applying fixups to older commits can be much more involved.

Using `git rebase` in combination with its `--autostash` and `--autosquash` options makes these fixups a lot easier. Combining a rebase with git's message-based revision syntax is a powerful way to effortlessly apply commit fixups.

> If you want to skip the explanations and get right to a useful shell function, [skip to the last section](#putting-it-all-together)

## The Naïve Way

Before I knew about `--autostash` and `--autosquash` these are the steps I used to go through to fixup historical commits:
1. Stage and commit the files I want to apply during the fixup
2. `git stash` the remaining, unstaged, unrelated files
4. `git log` and copy the hash of the revision I want to amend
5. `git rebase -i <commit-hash>~`
6. In the text editor, change the command for my fixup commit from `pick` to `fixup`
7. Reorder the commits so that my fixup commit is applied after the commit to be fixed
8. Execute the rebase
9. `git stash pop` to restore the unrelated changes to my working tree

There are 4 big areas in which this workflow can be improved:
1. Stashing and unstashing unrelated changes, improved with `--autostash`
2. Reordering and squashing the fixup commit, improved with `--autosquash`
3. Selecting the revision to fix, improved with `:/`
4. Having to use a text editor for the interactive rebase, improved by using `GIT_SEQUENCE_EDITOR`

## --autostash
Git's interactive rebase provides an `--autostash` option which will automatically stash uncommitted changes, then pop those changes back into your working tree after the rebase is executed.

Git only allows rebases when the working tree is clean, _i.e._ without any staged or unstaged changes, so if you're in the spot where you're not ready to commit changes, but need to perform a rebase, you must first stash your changes and then unstash them later on.

`git rebase -i --autostash` takes care of this for us, and saves us from having to perform steps 2 and 9 in the naïve workflow.

```shell
$ git status
# Changes not staged for commit:
#   modified:   README.md

# The working tree is dirty so regular rebase is forbidden
$ git rebase -i HEAD~2
# Cannot rebase: You have unstaged changes.
# Please commit or stash them.

# Using --autostash allows us to rebase anyway
$ git rebase -i --autostash HEAD~2
# Created autostash: 487c77a
# HEAD is now at e375c7a
# Applied autostash.
# Successfully rebased and updated refs/heads/master.

# The dirty working tree is preserved through the rebase
$ git status
# Changes not staged for commit:
#   modified:   README.md
```

## --autosquash

Git's interactive rebase provides an `--autosquash` option which will help us in two ways:
1. It will reorder commits with log messages starting with `fixup!` or `squash!` so that they are applied immediately after the commits with the same title (following those prefixes)
2. It will change the rebase command to `fixup` or `squash`, respectively

So if we can get a fixup commit titled `"fixup! <title of commit to fix>"`, `git rebase -i --autosquash` will save us from having to perform steps 6 and 7 from the naïve workflow.

How can we get one of these commits? Rather than manually typing out `fixup!` in your fixup commit messages, git provides some help: `git commit --fixup`
```shell
$ git log --oneline
# 3333333 (HEAD) Adds dev dependencies.
# 2222222 Updates README.
# 1111111 Adds framework boilerplate.

$ git commit --fixup 2222222
$ git log --oneline
# 4444444 (HEAD) fixup! Updates README.
# 3333333 Adds dev dependencies.
# 2222222 Updates README.
# 1111111 Adds framework boilerplate.

$ git rebase -i --autosquash HEAD~4
# * Shown in your text editor:
# pick 1111111 Adds framework boilerplate.
# pick 2222222 Updates README.
# fixup 4444444 fixup! Updates README.
# pick 3333333 Adds dev dependencies.

$ git log --oneline
# 6666666 (HEAD) Adds dev dependencies.
# 5555555 Updates README.
# 1111111 Adds framework boilerplate.
```

In this example, a fixup is committed for commit `2222222`, which shows up with `fixup!` in its commit title, and ends up getting reordered and labelled as `fixup` during the rebase.

After the rebase is executed you can see that the commit history has been modified, starting at commit `5555555` (previously `2222222`) where the fixup was applied.

## Text-based revision selection with `:/`

In the previous example, in order to create the fixup commit with `git commit --fixup 2222222`, we used the commit hash as the identifier (which we found through `git log`), but there's a more intuitive way we can specify which commit we want to fixup, using `:/`.

Using `:/` as a revision identifier tells git to find the most-recent commit which matches the text (really a regular expression) following those tokens. For example:
```shell
$ git log --oneline
# 3333333 (HEAD) Adds dev dependencies.
# 2222222 Updates README.
# 1111111 Adds framework boilerplate.

$ git show :/framework
# commit 1111111111111111111111111111111111111111
# Author: Chili Johnson
# Date:   Apr 20 04:20:00 2020 -0000
# 
#     Adds framework boilerplate.
# …
```

Now we can identify the commit to fix using its commit message, instead of having to find and copy the hash of the commit we want to fix. This eliminates part of step 4 of the naïve workflow.

## Non-interactive interactive rebase

Now we have most of the parts we need for an optimized fixup workflow, but there's still the problem of `--autosquash` and `--autostash` only working with interactive rebases. Those two options already do everything we need to do during the rebase so opening up a text editor isn't useful anymore.

To disable opening a text editor during the interactive rebase, we can use the `GIT_SEQUENCE_EDITOR` environment variable to override the editor which git tries to open.

Overriding it to a program/command which does nothing and exits cleanly will turn an interactive rebase into a non-interactive rebase, while retaining interactive-only features like the two options we're interested in.
```shell
# The rebase succeeds without ever opening a text editor
$ GIT_SEQUENCE_EDITOR=: git rebase -i HEAD~2
# Successfully rebased and updated refs/heads/master.
```
Here we're using many shells' built-in `:` command to do nothing and exit cleanly, which allows the rebase to continue on without requiring any interaction.

# Putting it all together

Here is a shell function I use (with `zsh`) which combines all of these optimizations into one command which can be used to fixup commits identified by part of their commit message:
```shell
fixup () {
  echo "\nThis operation will rebase:\n"
  git --no-pager log --oneline "HEAD^^{/$1}^..HEAD" --reverse

  echo
  read -q "REPLY?Are you sure? "
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]
  then
    git commit --fixup ":/$1" && GIT_SEQUENCE_EDITOR=: git rebase --interactive --autostash --autosquash "HEAD^^{/$1}^"
  fi
}
```

First it prints out which commits will be affected by this rebase and asks for confirmation that all looks good. Then it proceeds to commit any staged changes (stashing any unstaged changes), performs a non-interactive, "interactive" rebase to apply the fixup, and finally restores the unstaged changes to the working tree.

It accepts one argument, the commit message title fragment (regex) to match the commit intended to be fixed.

An example usage:
```shell
$ git log --oneline
# 3333333 (HEAD) Adds dev dependencies.
# 2222222 Updates the readme with an outro.
# 1111111 Adds framework boilerplate.

$ echo "Thanks for reading" >> README.md
$ echo "Do whatever you want" > LICENSE
$ git add README.md
$ git status
# Changes to be committed:
#   modified:   README.md
# 
# Changes not staged for commit:
#   modified:   LICENSE

$ fixup outro
# This operation will rebase:
# 
# 2222222 Updates the readme with an outro.
# 3333333 (HEAD) Adds dev dependencies.
# 
# Are you sure? y
# [master 5555555] fixup! Updates the readme with an outro.
#  1 file changed, 1 insertion(+), 1 deletion(-)
# Created autostash: 2f16c33
# HEAD is now at 5555555 fixup! Updates the readme with an outro.
# Applied autostash.
# Successfully rebased and updated refs/heads/master.

$ git log --oneline
# 5555555 (HEAD) Adds dev dependencies.
# 4444444 Updates the readme with an outro.
# 1111111 Adds framework boilerplate.

$ git status
# Changes not staged for commit:
#   modified:   LICENSE
```

By making use of `--autostash`, `--autosquash`, `:/`, and `GIT_SEQUENCE_EDITOR`, we've been able to distill that 9-step fixup workflow—which demanded multiple interactive steps and a copy-paste job—into a single, intuitive command which allows you to apply fixups for selective files while maintaining a dirty working tree.

I use this all the time in my daily workflow!

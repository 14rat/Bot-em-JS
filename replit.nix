{ pkgs }: {
  deps = [
    pkgs.sox
    pkgs.jellyfin-ffmpeg
    pkgs.nodePackages.vscode-langservers-extracted
    pkgs.nodePackages.typescript-language-server  
  ];
}
{ pkgs }: {
  deps = [
    pkgs.jellyfin-ffmpeg
    pkgs.nodePackages.vscode-langservers-extracted
    pkgs.nodePackages.typescript-language-server  
  ];
}
{
  description = "OpenPresenter - minimalist worship presentation software";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/148bab9c1c3c53136ecb44a6ea356a0ed5b39b06";
    rust-overlay.url = "github:oxalica/rust-overlay/32346a8154e65fa10bac36f7b476a5294cb8b150";
    rust-overlay.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      rust-overlay,
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [ rust-overlay.overlays.default ];
          };
          toolchain = pkgs.rust-bin.stable.latest.default.override {
            extensions = [
              "rust-src"
              "rustfmt"
              "clippy"
            ];
          };
        in
        {
          default = pkgs.mkShell {
            packages =
              with pkgs;
              [
                toolchain
                nodejs_22
                pnpm
                pkg-config
                rust-analyzer
                sccache
              ]
              ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
                webkitgtk_4_1
                gtk3
                libayatana-appindicator
                librsvg
                glib
                dbus
                openssl
              ];

            env = {
              RUSTC_WRAPPER = "${pkgs.sccache}/bin/sccache";
              CARGO_INCREMENTAL = "0";
              SCCACHE_CACHE_SIZE = "10G";
            };

            shellHook = ''
              echo "OpenPresenter dev shell: cargo $(cargo --version)"
            '';
          };
        }
      );
    };
}

package com.cellardebt.game;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import gammafp.playgames.PlayGamesPlugin;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(PlayGamesPlugin.class);
    super.onCreate(savedInstanceState);
  }
}

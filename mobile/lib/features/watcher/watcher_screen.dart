import 'package:flutter/material.dart';

class WatcherScreen extends StatelessWidget {
  const WatcherScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('iBinda')),
      body: const Center(
        child: Text('Watcher-Modus — kommt gleich'),
      ),
    );
  }
}
